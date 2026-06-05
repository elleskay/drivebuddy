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
        BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0",
      },
      // OpenSearch is off by default (a domain is not free). Turn on when you
      // need clustering of similar reports.
      enableOpenSearch: process.env.ENABLE_OPENSEARCH === "true",
    });

    // The HTTP Lambda runs the AI assistant: it reads/writes the audio bucket and
    // calls Bedrock (LLM), Polly (TTS) and Transcribe (STT).
    audioBucket.grantReadWrite(api.httpFunction);
    api.httpFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
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
  }
}
