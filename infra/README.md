# infra

AWS infrastructure for the API. The mobile app does not deploy to AWS; it builds
and ships via EAS (see `docs/MOBILE.md`).

- `cdk/drivebuddy/` - the API stack. Deploys the NestJS HTTP Lambda + API
  Gateway + SQS job queue + worker Lambda + audio scratch bucket via the
  `NestjsApi` construct, plus the EventBridge schedules.
- `cdk/_setup/` - one-time stack. Creates the GitHub OIDC provider reference and
  an IAM role the deploy workflow assumes. Run once per AWS account + repo.
- `iam/cdk-deploy-policy.json` - least-privilege policy attached to that role.

Order: deploy `_setup` once, copy the output role ARN into GitHub secrets as
`AWS_DEPLOY_ROLE_ARN`, then the deploy workflow handles `cdk/drivebuddy` after
CI passes on every push to main. Full steps in `docs/SETUP.md` and
`docs/DEPLOY.md`.
