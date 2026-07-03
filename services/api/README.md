# DriveBuddy API

NestJS API for DriveBuddy (a root-workspace package, so `npm ci` at the repo
root installs its deps). Runs as one Lambda behind an API Gateway HTTP API,
plus a second Lambda bound to the SQS job queue for async work (push fan-out,
scheduled analysis). Local dev runs it as a normal Nest server.

## Domains

- `health/` - liveness probe for the smoke test and gateway health check.
- `auth/` - register/login/refresh; JWT access + refresh tokens (passport).
- `users/`, `vehicles/` - profile and vehicle CRUD; the main vehicle's fuel
  consumption drives trip costing.
- `drive-monitor/` - the recording path: start a route, append GPS point
  batches, complete. Completion triggers costing.
- `trips/` - costed trip summaries (fuel + ERP; parking is a reserved field).
- `route-analysis/` - insights and recommendations computed from trip history.
- `external/` - public Singapore live feeds (weather, traffic, ERP, carpark,
  petrol) with an in-memory TTL cache, plus keyless OSRM routing.
- `ai/` - the assistant: context-grounded answers via the Anthropic Claude API;
  voice pipeline via S3 + Transcribe (in) and Polly (out).
- `notifications/` - in-app notification center, settings, device tokens, and
  the SQS push enqueue.

Entry points: `src/main.ts` (local server), `src/lambda.ts` (HTTP Lambda),
`src/worker.ts` (SQS worker; handles push, analyze-all, pre-drive-sweep jobs).

## Conventions

- Every controller takes a class-validator DTO. The global `ValidationPipe`
  runs with `whitelist` + `forbidNonWhitelisted`, so unknown fields are rejected.
- The user id always comes from the JWT (`@CurrentUser()`), never the body.
- Anything slow or scheduled goes through the SQS worker, not the request path.
- External helpers no-op cleanly when their env vars are unset (see
  `.env.example`), so local and CI runs need no AWS credentials.

## Run

```bash
npm install         # from the repo root (workspace install)
npm run start:dev   # local server on :3000
npm run typecheck
npm run lint
npm test            # vitest unit tests (pure logic; no DB needed)
```

Data lives in Postgres via Prisma (`prisma/schema.prisma`); apply migrations
with `db/migrate.ts` (deploy does this automatically) or `npm run prisma:migrate`
in dev.

## Deploy

Bundled and deployed by `infra/cdk/drivebuddy` (the `NestjsApi` construct
points the HTTP Lambda at `src/lambda.ts` and the worker at `src/worker.ts`).
See `docs/DEPLOY.md`.
