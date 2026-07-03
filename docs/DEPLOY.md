# Deploy

Three pipelines: the API (GitHub Actions + CDK to AWS), the web demo (GitHub
Pages), and the app (EAS to the stores / OTA). The API and web deploys run
after CI passes on `main`; the app builds on manual dispatch.

## API (`.github/workflows/deploy-api.yml`)

After CI succeeds on `main` (or on manual dispatch):

1. Preflight skips the deploy if `AWS_DEPLOY_ROLE_ARN` is unset (keeps forks
   green before secrets are configured).
2. OIDC-assumes the deploy role. No stored AWS keys.
3. Applies DB migrations (`services/api/db/migrate.ts`) before the new code
   goes live, so a Lambda referencing new columns never races the schema.
4. Builds the API (`nest build`).
5. `cdk deploy --all`. The `NestjsApi` construct stages `src/lambda.ts` (HTTP)
   and `src/worker.ts` (SQS worker) as tsc output plus production node_modules.
6. Extracts the `ApiUrl` output and runs `scripts/verify-deploy.sh` as a smoke
   test.

## Web demo (`.github/workflows/deploy-web.yml`)

After CI succeeds on `main` (or on manual dispatch): exports the Expo app for
web (`expo export --platform web`) pointed at the live API and publishes it to
GitHub Pages, with a `404.html` copy for SPA deep links. Native-only features
(background GPS, push, audio capture) degrade gracefully on web.

## App (`.github/workflows/mobile-build.yml`)

Manual dispatch. Either `build` (store binary via EAS Build, optional
auto-submit) or `update` (JS-only OTA via EAS Update). Skips if `EXPO_TOKEN` is
unset. See `docs/MOBILE.md`.

## Gotchas this repo has hit (do not relearn)

1. **`EXPO_PUBLIC_*` is inlined into the bundle and is public.** The API URL is
   fine; API keys are not. Keep secrets server-side.
2. **NestJS on Lambda must cache the bootstrapped app** across warm invocations
   (done in `src/lambda.ts`). Re-bootstrapping per call balloons cold starts.
3. **Lambda handlers must be root-level files with no dot in the name.** The
   nodejs20.x runtime splits the handler string on the first dot, so a nested
   handler like `jobs/x.consumer.handler` fails init. Hence `lambda.ts` and
   `worker.ts` at the bundle root.
4. **Do not esbuild-bundle the Nest app.** esbuild drops
   `emitDecoratorMetadata` and reorders modules, which silently breaks
   constructor injection at runtime. The construct ships tsc output plus
   production node_modules instead, then slims the AWS SDK dist-es copies and
   non-arm64 Prisma engines to stay under Lambda's 250 MB unzipped limit.
5. **SQS consumers must be idempotent.** At-least-once delivery; the worker
   uses `reportBatchItemFailures` for partial retries and a DLQ after 5
   receives.
6. **API Gateway payload cap is 10 MB.** Large uploads belong in S3, not the
   JSON body (voice clips are small enough to ride along base64-encoded).
7. **CDK env vars are baked at synth time**, not deploy time.
8. **OTA updates ship JS/assets only.** Anything touching native code (new
   permission, new module) needs a full store build, not an OTA push.
9. **Refactoring resources into a construct changes logical IDs.** The queue
   construct ids keep their original template names for this reason; use
   `logicalIdOverrides` on `NestjsApi` for other in-place upgrades.

## Rollback

API: `cdk deploy` the previous commit, or `aws cloudformation cancel-update-stack`
mid-deploy. App: promote a previous EAS build, or `eas update` a known-good JS
bundle to the channel.
