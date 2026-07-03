# Secure Software Development Lifecycle

The controls this repo ships with, and the practices the code is expected to maintain.

## Pipeline controls

| Control                            | Where                                     |
| ---------------------------------- | ----------------------------------------- |
| Dependency scanning                | `.github/dependabot.yml`                  |
| Code scanning (SAST)               | `.github/workflows/security.yml` (CodeQL) |
| Secret scanning                    | GitHub native + gitleaks workflow         |
| `npm audit` on CI                  | `.github/workflows/security.yml`          |
| Branch protection                  | manual GitHub setting (see SETUP.md)      |
| Conventional commits               | `commitlint.config.mjs`                   |
| PR template with security checkbox | `.github/pull_request_template.md`        |
| Disclosure policy                  | `SECURITY.md`                             |

## Application practices

In place today:

| Control          | How                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Input validation | class-validator on every controller DTO; global `ValidationPipe` rejects unknown fields  |
| Auth             | JWT access + refresh tokens issued by the API; stored on device in expo-secure-store     |
| Authorization    | `JwtAuthGuard` on every non-public route; the user id comes from the JWT, never the body |
| Transport        | TLS only: iOS ATS on, Android cleartext off via the `expo-build-properties` plugin       |
| Secrets in prod  | GitHub Actions secrets -> Lambda env at deploy; nothing secret ships in the app bundle   |
| Database access  | Prisma only (parameterized queries)                                                      |
| Logging          | Nest `Logger` everywhere; no tokens or credentials logged                                |

Worth adding as the product grows: rate limiting on the auth routes (NestJS
throttler or AWS WAF) and error tracking (Sentry).

## Threat model basics

For every new feature, ask:

1. What inputs does it accept? Are they validated?
2. Who is allowed to call it? How is that enforced?
3. What does it read or write? Could it leak data?
4. What happens on failure? Does the error response leak info?
5. Is anything cached? Could caching cross user boundaries?

## Incident response

If a vulnerability is found:

1. Acknowledge to reporter within 72 hours
2. Patch in a private branch
3. Rotate any leaked secrets via AWS Secrets Manager
4. Deploy fix
5. Disclose publicly after patch is live

## References

- OWASP Top 10
- OWASP ASVS for verification levels
- AWS Well-Architected, Security Pillar
