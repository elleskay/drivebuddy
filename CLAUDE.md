# DriveBuddy, Claude Code conventions

DriveBuddy is an AI driving companion for Singapore: an Expo (React Native)
app backed by a NestJS API on AWS serverless (Lambda + API Gateway + SQS +
Neon Postgres). It records drives with GPS (foreground and background), costs
each trip (fuel + ERP), shows live Singapore driving data, sends push
notifications, and answers questions by voice or text via the Anthropic Claude
API. Live demo: https://elleskay.github.io/drivebuddy/

## Structure

```
apps/drivebuddy/          # Expo app (Expo Router). Screens in app/, client logic in lib/.
services/api/             # NestJS API (a workspace). src/main.ts local, src/lambda.ts HTTP
                          # Lambda, src/worker.ts SQS worker (push, analyze-all, pre-drive-sweep).
packages/spec-test/       # Spec-coverage gate tooling (Vitest/jest/Maestro adapters + CLIs).
infra/cdk/drivebuddy/     # CDK app: DriveBuddyApi stack (NestjsApi construct + S3 audio
                          # bucket + EventBridge schedules).
infra/cdk/_setup/         # One-time stack: GitHub OIDC deploy role.
infra/iam/                # Least-privilege deploy policy JSON.
scripts/                  # connect.sh (one-command cloud setup), verify-deploy.sh (smoke
                          # test), verify-attestations.sh (signed-artifact check).
.github/workflows/        # ci.yml, security.yml, deploy-api.yml, deploy-web.yml,
                          # mobile-build.yml. Deploys run after CI passes on main.
docs/                     # SETUP, DEPLOY, MOBILE, TESTING, SSDLC, ADR 0001.
```

## Commands

All from the repo root (npm workspaces):

```bash
npm run typecheck    # tsc across all workspaces
npm run lint         # eslint across all workspaces (zero-warning bar)
npm test             # API vitest unit tests (pure logic; no DB needed)
npm run format:check # prettier (CI enforces)
```

CDK synth/deploy run inside `infra/cdk/drivebuddy` (own lockfile, not a
workspace).

## Stack conventions

- Expo + Expo Router + TypeScript strict; NestJS + TypeScript strict
- Node 20+ (CI runs 22); Postgres via Prisma 6 (Neon serverless)
- Auth: JWT access + refresh tokens; stored in expo-secure-store; user id
  always from the JWT (`@CurrentUser()`), never the request body
- Validation: class-validator DTO on every controller; global ValidationPipe
  with whitelist + forbidNonWhitelisted
- Async work (push fan-out, scheduled jobs) goes through SQS to the worker
  Lambda, never the request path
- External helpers no-op cleanly when env vars are unset (LTA key, Anthropic
  key, queue URL), so local dev and CI need no AWS credentials
- AWS CDK for IaC; EAS for app builds; GitHub Actions + OIDC for API deploys
- Conventional Commits (commitlint runs on PRs)

## Style

- No em dashes anywhere (chat, code, docs, UI strings). Use comma, period, parens, or colon.
- No emojis in code or docs unless explicitly requested.
- Keep README and docs short. Lead with the answer.
- Match Prettier (CI enforces `format:check`) and the zero-warning ESLint bar.

## Security defaults

- Never commit secrets. `.env`/`.env.local` are gitignored; production secrets
  live in GitHub Actions secrets and Lambda env vars (set at deploy).
- Nothing secret ships in the mobile bundle. `EXPO_PUBLIC_*` vars are inlined
  at build time and are public; the API URL is fine, keys are not.
- TLS only: iOS App Transport Security on, Android cleartext traffic off via
  the `expo-build-properties` plugin.
- The IAM policy in `infra/iam/cdk-deploy-policy.json` is the deploy role's
  baseline. Use it instead of `AdministratorAccess`.

## Known production gotchas (do not relearn)

Documented in `docs/DEPLOY.md` and `docs/MOBILE.md`. Don't undo the fixes:

1. **`expo prebuild` generates `ios/`/`android/`; never commit or hand-edit them.**
2. **NestJS on Lambda must reuse the bootstrapped app across invocations**
   (`src/lambda.ts` caches it), or cold starts and memory balloon.
3. **Lambda handlers must be root-level files with no dot in the name.** The
   nodejs20.x runtime splits the handler string on the first dot; hence
   `lambda.ts` (`lambda.handler`) and `worker.ts` (`worker.handler`).
4. **Do not esbuild-bundle the Nest app.** esbuild drops decorator metadata and
   silently breaks constructor DI. The construct ships tsc output + production
   node_modules, slimmed (AWS SDK dist-es, non-arm64 Prisma engines removed).
5. **SQS consumers must be idempotent**; the worker uses partial-batch
   failures and a DLQ (maxReceive 5).
6. **API Gateway payload limit is 10 MB**; big uploads go to S3, not the body.
7. **CDK env vars are baked at synth time**, not deploy time.
8. **OTA updates (EAS Update) ship JS/assets only**; native changes need a full
   store build.
9. **Renaming CDK construct ids changes CloudFormation logical IDs** and
   destroys/recreates resources. The queue construct ids keep their original
   template names ("ReportsQueue"/"ReportsDlq") for this reason; use
   `logicalIdOverrides` for in-place upgrades.
10. **expo-notifications/expo-constants types do not resolve under the ESLint
    project service** (they do under tsc). `lib/push.ts` carries a scoped
    eslint-disable with the explanation; don't "fix" it by loosening tsconfig.
11. **The background location task executor must stay async/awaited.**
    TaskManager awaits the executor before telling the OS the task finished;
    making it fire-and-forget lets the OS suspend the app mid-upload and drop
    GPS batches (`lib/location-task.ts`).

## Testing

Current state (see `docs/TESTING.md`): the API has Vitest unit tests over pure
logic (`services/api/src/**/*.spec.ts`), run by `npm test` and CI; the app has
no automated tests yet (CI typechecks, lints, and web-exports it).

When extending tests, use the spec-driven system in `packages/spec-test`:
requirements in a YAML spec, tests named with the `[ID]` prefix, the
`spec-coverage` gate enforcing coverage, and signed `verification/` artifacts
for OS-level behavior (background GPS, push) that JS tests cannot reach. For
any user-facing feature, prefer at least one journey-level e2e over more
isolated unit tests; on-device behavior is verified per `docs/MOBILE.md`
before releases.
