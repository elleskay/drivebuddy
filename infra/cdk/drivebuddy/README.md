# infra/cdk/drivebuddy

CDK package for the DriveBuddy API. `bin/app.ts` defines one stack,
`DriveBuddyApi` (the CloudFormation stack name).

## What it deploys

Via the `NestjsApi` construct (`lib/constructs/NestjsApi.ts`):

- HTTP Lambda (`src/lambda.ts`, serverless-express) behind an API Gateway HTTP API
- SQS job queue (push fan-out + scheduled jobs) plus a dead-letter queue
  (maxReceive 5)
- Worker Lambda (`src/worker.ts`) consuming the queue with partial-batch
  responses

Plus, in `lib/api-stack.ts`:

- S3 audio scratch bucket (1-day expiry) for the voice assistant, with
  Polly/Transcribe IAM grants on the HTTP Lambda
- EventBridge schedules: daily `analyze-all` (02:00 SGT) and hourly
  `pre-drive-sweep`, both delivered through the SQS queue

`PUSH_QUEUE_URL` and `AUDIO_BUCKET` are injected into the Lambdas by the stack.
Pass the rest (`DATABASE_URL`, `JWT_SECRET`, `LTA_ACCOUNT_KEY`,
`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `DD_SERVICE`) via the shell/CI env.
Env vars are baked at synth time.

## Commands

```bash
npm install
npm run synth     # cdk synth
npm run diff
npm run deploy    # cdk deploy --all
```

Set `CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION`, and the service env vars in the
shell that runs deploy. CI does this via OIDC; see `docs/DEPLOY.md`.

## Gotchas baked in

- Nest app cached across warm invocations (in the service's `lambda.ts`).
- SQS worker is idempotent and uses `reportBatchItemFailures`.
- The AWS SDK is provided by the Lambda runtime; the bundle ships tsc output
  plus production node_modules (esbuild bundling breaks Nest DI metadata).
- The queue construct ids keep their original template names so CloudFormation
  logical IDs stay stable; use `logicalIdOverrides` for other in-place upgrades.
