import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import { NestjsApi } from "./constructs/NestjsApi";

// Default to the conventional `services/api` location. Override via
// PLATFORM_DEMO_API_PATH so platform CI can point at the template service for
// self-test without rewriting this file.
const API_REL = process.env.PLATFORM_DEMO_API_PATH ?? "services/api";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Audio scratch bucket for the AI voice assistant: holds uploaded clips and
    // Transcribe output. Objects expire quickly - they're transient.
    const audioBucket = new s3.Bucket(this, "AudioBucket", {
      lifecycleRules: [{ expiration: cdk.Duration.days(1) }],
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const api = new NestjsApi(this, "Api", {
      servicePath: path.resolve(__dirname, "..", "..", "..", "..", API_REL),
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        JWT_SECRET: process.env.JWT_SECRET ?? "",
        JWT_ISSUER: process.env.JWT_ISSUER ?? "mobile-platform",
        CLASSIFIER_API_URL: process.env.CLASSIFIER_API_URL ?? "",
        CLASSIFIER_API_KEY: process.env.CLASSIFIER_API_KEY ?? "",
        DD_SERVICE: process.env.DD_SERVICE ?? "mobile-platform-api",
        LTA_ACCOUNT_KEY: process.env.LTA_ACCOUNT_KEY ?? "",
        AUDIO_BUCKET: audioBucket.bucketName,
        // The AI assistant's LLM runs on the Anthropic Claude API (not Bedrock):
        // just an API key, no AWS model-access/quota setup.
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
        // `||` so an unset GitHub Actions var (empty string) falls back to the default.
        ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
      },
      // OpenSearch is off by default (a domain is not free). Turn on when you
      // need clustering of similar reports.
      enableOpenSearch: process.env.ENABLE_OPENSEARCH === "true",
    });

    // The HTTP Lambda runs the AI assistant: it reads/writes the audio bucket and
    // calls Polly (TTS) and Transcribe (STT). The LLM is the Anthropic Claude API
    // (an outbound HTTPS call with an API key) - no AWS IAM needed for it.
    audioBucket.grantReadWrite(api.httpFunction);
    api.httpFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "polly:SynthesizeSpeech",
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
        ],
        resources: ["*"],
      }),
    );

    // Daily behaviour-analysis cron: EventBridge to SQS (the construct's queue) to
    // worker `analyze-all` job. 18:00 UTC = 02:00 SGT (off-peak). The worker
    // regenerates recommendations and notifies users with fresh tips.
    new events.Rule(this, "DailyAnalysis", {
      schedule: events.Schedule.cron({ minute: "0", hour: "18" }),
      targets: [
        new targets.SqsQueue(api.queue, {
          message: events.RuleTargetInput.fromObject({ kind: "analyze-all" }),
        }),
      ],
    });

    // Pre-drive intelligence: hourly sweep. The worker sends each user a heads-up
    // ~1h before their usual departure time (weather, traffic, ERP-peak warning),
    // capped at one per user per day. Runs every hour so it can line up with any
    // user's learned departure hour.
    new events.Rule(this, "PreDriveSweep", {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      targets: [
        new targets.SqsQueue(api.queue, {
          message: events.RuleTargetInput.fromObject({ kind: "pre-drive-sweep" }),
        }),
      ],
    });
  }
}
