# Testing

## Current state

- **API (`services/api`)**: Vitest unit tests over the pure logic (geo maths,
  ERP cost estimation, trip insights) in `src/**/*.spec.ts`. `npm test` runs
  them with no database or AWS dependencies, and CI runs them on every push/PR.
- **Spec gate tooling (`packages/spec-test`)**: built and self-tested in CI
  (the gate's own pass/fail behaviour is exercised against the samples).
- **App (`apps/drivebuddy`)**: no automated tests wired yet. CI typechecks and
  lints it and proves the web export builds. On-device behaviour (background
  GPS, push) is verified manually per `docs/MOBILE.md`.

The rest of this doc describes the spec-driven system `packages/spec-test`
implements, for when test coverage here is extended to spec-gated coverage.

## The spec-driven model

Requirements live in a YAML spec; every requirement must have a passing test
whose title is prefixed with the requirement ID and that contains at least one
`expect()`. The gate (`spec-coverage`) exits non-zero if any requirement is
uncovered, a covering test fails, or the only passing test is in the wrong
layer.

```
specs/<app>.yml                  -> declares requirements with IDs
tests/**/*.spec.ts(x)            -> jest-expo tests (app) / Vitest tests (API)
.maestro/*.yaml                  -> Maestro e2e flows, ingested by spec-maestro
@platform/spec-test (runner)     -> records per-test pass/fail to JSONL
spec-coverage CLI                -> diffs spec IDs vs covered IDs, exits 1 on gaps
ESLint rule                      -> fails lint if a spec test body has zero expect()
```

## Spec file format

```yaml
app: <appname> # required
version: 1 # required, integer
requirements:
  - id: <APP>-<DOMAIN>-<NNN> # required, unique, e.g. DRIVE-TRIP-004
    title: One-line summary # required, 5..200 chars
    category: functional # required: functional | ui | security | data | a11y
    severity: high # required: critical | high | medium | low
    given: Precondition # required
    when: Action # required
    then: Expected outcome # required
    verify: e2e # optional: unit|component|integration|contract|e2e|native|manual
    platforms: [ios, android] # optional: required result per platform for e2e/native
    tags: [journey] # optional
    depends_on: [] # optional, must reference other valid IDs
    notes: Free-form notes # optional
```

The schema is enforced by zod. Unknown fields, duplicate IDs, and invalid
`depends_on` references all throw.

## Verification levels (`verify`) and native artifacts

`verify` states, explicitly, the level that must prove a requirement (see
`docs/adr/0001-testing-architecture.md`). When unset, a requirement falls back
to legacy behavior (covered by any passing recorded test).

`unit | component | integration | contract | e2e` are proven by an automated
test recorded to the coverage JSONL.

`native | manual` cannot be proven by a JS test (for DriveBuddy: background
location capture and push delivery run at the OS level). Instead the gate
requires a **signed verification artifact** per requirement and per platform,
committed under `verification/`:

```yaml
# verification/DRIVE-BGGPS-001.ios.yml
requirement: DRIVE-BGGPS-001
platform: ios
app_version: 1.4.0
os_tested: "18.3.1" # the OS build actually exercised
device: iPhone 13
date: 2026-05-20
tester: elleskay
evidence: https://.../recording.mp4
signature: <non-empty>
```

The gate fails a native/manual requirement if its artifact is missing,
unsigned, invalid, or **stale**. Stale means any of: the app version moved past
the tested version; the tested OS is behind `verification/os-baseline.yml` for
that platform; or the artifact is older than the 90-day TTL floor. Read it as
"re-verify once per release or every 90 days, whichever comes first."

```bash
spec-coverage --spec specs/<app>.yml \
  --verification-dir verification \
  --os-baseline verification/os-baseline.yml \
  --app-version 1.4.0
```

`--app-version` is required whenever the spec has any native/manual
requirement; without it the gate exits 2 rather than guess.

Two layers protect each artifact (ADR 0001, R1.5):

- **A, integrity:** `signature` is a checksum over the canonical body. Stamp it
  with `spec-attest --artifact <file>` (and `--check` to verify). The gate
  recomputes it, so editing the body after stamping is flagged `tampered`.
- **B, accountability:** the binding attestation is the signed git commit that
  last touched the artifact, by a signer in `verification/allowed-signers`.
  Enforced in CI by `scripts/verify-attestations.sh` (the CI job points it at
  `apps/drivebuddy/verification`), which fails closed once artifacts exist. It
  skips while the directory or allow-list is empty.

## Runners per verify level

- `unit` (pure logic): **Vitest** (API) / **jest-expo** (app), recorded as `data`
- `component` (render a screen): **jest-expo + React Native Testing Library**, recorded as `ui`
- `e2e` (journeys): **Maestro**, recorded as `functional` via the `spec-maestro` shim
- `native` / `manual`: signed `verification/` artifacts, not tests

If a `ui` requirement is only covered by a unit test, the gate flags a category
mismatch and fails.

## Writing tests

Name the test (or Maestro flow) with the requirement ID in brackets; the
runner parses `[ID]` and records the result.

```ts
// services/api/src/route-analysis/analysis.spec.ts (Vitest)
test("[DRIVE-INSIGHT-002] ERP-peak departures are counted", () => {
  const i = computeInsights(trips);
  expect(i.erpPeakTrips).toBe(2);
});
```

```yaml
# .maestro/record-drive.yaml (Maestro, e2e). The flow name carries the [ID];
# spec-maestro reads it from the JUnit output.
appId: com.elleskay.drivebuddy
name: "[DRIVE-TRIP-001] a recorded drive produces a costed summary"
---
- launchApp: { clearState: true }
- tapOn: { text: "Start drive" }
- tapOn: { text: "End drive" }
- assertVisible: { text: "Trip summary" }
```

Register the recorder once per runner: Vitest via `setupFiles` ->
`setupSpecCoverage()` from `@platform/spec-test/vitest` (already wired in
`services/api/test/setup.ts`); jest-expo via `setupFilesAfterEnv` ->
`setupSpecCoverage({ category })` from `@platform/spec-test/jest`; Maestro has
no in-test hook, `spec-maestro --report maestro.xml` ingests the JUnit output.

### Practical gotchas (learned the hard way)

- **Decouple presentation from fetching in component tests.** A component that
  loads data in a mount `useEffect` and then asserts on it is flaky on
  memory-constrained CI runners. Extract a pure presentational component and
  unit-test it with seeded data synchronously.
- **Don't run animations past unmount.** Store the `Animated` value's
  `CompositeAnimation` and `.stop()` it in the effect cleanup, or a leaked
  timer destabilizes the run.
- **Maestro: the soft keyboard hides elements.** After `inputText`, add
  `- hideKeyboard` and/or `- scrollUntilVisible` before tapping anything below
  the input.

## The ESLint rule

`@platform/spec-test` exports `eslintPlugin` with the rule
`require-expect-in-spec-test`. Wire it into a flat config for the test globs:

```js
import { eslintPlugin as specTest } from "@platform/spec-test";

export default [
  {
    files: ["tests/**/*.ts", "src/**/*.spec.ts"],
    plugins: { "spec-test": specTest },
    rules: { "spec-test/require-expect-in-spec-test": "error" },
  },
];
```

Without it, a test could carry an `[ID]` title and assert nothing, and the ID
would be marked covered because the test passed.

## Failure modes the gate catches

- Missing test for a spec entry -> uncovered, exit 1
- Test exists but fails -> failing, exit 1
- Test exists, passes, zero `expect()` -> lint fails before tests run
- Test in the wrong layer (ui requirement only in Vitest) -> category mismatch, exit 1

## Failure modes the gate does NOT catch

- A spec written wrong (the test agrees with a wrong requirement). Spec
  correctness is on the human reviewer.
- Behavior with no spec entry. Review discipline catches it.
- Flaky e2e on device. Use retries; hunt and fix flakes.
- **Decomposed-journey gaps.** A user-facing feature spread across several IDs
  can be 100% covered while one link in the chain is broken. For DriveBuddy the
  sharp version: unit tests around costing are green, the API is green, but the
  OS never delivered a background location batch, so real drives record only
  while the screen is on. **Mitigation:** one journey-level e2e per user-facing
  feature, plus real-device verification of native behavior before release
  (see `docs/MOBILE.md`).
