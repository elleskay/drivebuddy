# Security Policy

## Reporting a vulnerability

Report security issues via either channel (prefer the first if available):

1. **GitHub Private Vulnerability Reporting:** [github.com/elleskay/drivebuddy/security/advisories/new](https://github.com/elleskay/drivebuddy/security/advisories/new). Encrypted, tracked, and lets us coordinate a fix and CVE if needed.
2. **Email:** lskpes10@gmail.com

Do not open public GitHub issues for security problems.

Expected response time: 72 hours.

## Supported versions

Latest `main` only.

## Scope

Security defaults this repo ships with (the DriveBuddy app plus its API):

- Dependency scanning via Dependabot
- Code scanning via GitHub CodeQL, secret scanning via GitHub native + gitleaks
- Input validation via class-validator on every NestJS controller DTO
- JWT auth on the API: short-lived access tokens plus refresh tokens, stored on
  device in expo-secure-store
- Secrets live in GitHub Actions secrets and Lambda env vars (set at deploy);
  nothing secret ships in the mobile bundle (anything on the device is public)
- TLS only: iOS App Transport Security on, Android cleartext traffic off

See `docs/SSDLC.md` for the secure development lifecycle this repo follows.
