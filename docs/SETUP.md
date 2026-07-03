# Setup

From a fresh clone to a running app and a deployable API. The app ships via
EAS; the API ships via GitHub Actions + CDK to AWS.

## 1. Clone and run locally

```bash
git clone https://github.com/elleskay/drivebuddy
cd drivebuddy
npm install                       # installs all workspaces

# API (needs a Postgres URL in services/api/.env.local; Neon free tier works)
cd services/api && npm run start:dev

# App (new terminal; press w for web, or scan the QR in Expo Go)
cd apps/drivebuddy && npm run start
```

Point the app at your local API with `EXPO_PUBLIC_API_URL=http://localhost:3000`
(or leave the default; `app.json` falls back to the deployed demo API).

## 2. Connect GitHub and AWS (one command)

Run the connect script once per repo. It ensures the OIDC provider, deploys the
`infra/cdk/_setup` deploy role, provisions a database (Neon), generates
`JWT_SECRET`, and sets every GitHub Actions secret and variable the API deploy
workflow needs.

```bash
npm run setup
# preview without changing anything: scripts/connect.sh --dry-run
```

Prerequisites: `gh` (authenticated), `aws` (credentials allowed to create an
IAM role + OIDC provider and to bootstrap CDK), Node 20+. Optional: `neonctl`
to auto-provision the database.

It sets the **secrets** `AWS_DEPLOY_ROLE_ARN`, `DATABASE_URL`, `JWT_SECRET`
(and `EXPO_TOKEN` if you pass one) and the **variable** `AWS_REGION`. Add these
by hand for the full feature set:

- `LTA_ACCOUNT_KEY` (secret): LTA DataMall key for live traffic/ERP/carpark
- `ANTHROPIC_API_KEY` (secret): Claude API key for the AI assistant
- `ANTHROPIC_MODEL` (variable, optional): defaults to `claude-haiku-4-5`
- `DEMO_API_URL` (variable, optional): API URL the GitHub Pages demo targets

<details>
<summary>Prefer to do the AWS/GitHub side by hand?</summary>

```bash
cd infra/cdk/_setup
npm install
npx cdk deploy -c repo=elleskay/drivebuddy   # copy the DeployRoleArn output
```

Then set the secrets/variables above manually (`gh secret set` / `gh variable set`).

</details>

## 3. Link EAS (one-time, interactive)

EAS login and store credentials are interactive by design:

```bash
npm i -g eas-cli && eas login
cd apps/drivebuddy && eas init   # links the project
eas credentials                  # iOS/Android signing, when you build
```

To run EAS builds from CI, set an `EXPO_TOKEN` secret. Full mobile setup:
`docs/MOBILE.md`.

## 4. Push

Push to `main`. CI runs first (typecheck, lint, tests, synth); when it passes,
the deploy workflows assume the AWS role via OIDC, run `cdk deploy`, smoke-test
the API, and publish the web demo to GitHub Pages. Deploy details and gotchas:
`docs/DEPLOY.md`.
