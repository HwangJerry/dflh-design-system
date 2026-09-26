# TS02 — iOS: shared HTTP stub + fixture loader, coverage report script

Repo: dflh-saf-v2-swift. Branch: `test/ts02-test-helpers` (create from `main`; independent of TS01).

1. Tests currently define a private URLProtocol stub per file (about 7 copies, e.g. AuthSecurityTests, AppSettingsRepositoryTests,
   NetworkErrorMessageTests, SentryPrivacyTests, AnalyticsEventReporterTests, PrivacyConsentTests). Add ONE shared helper under
   Tests/DflhSafV2SwiftTests/Support/: a `StubURLProtocol` with per-test handler registration (request → (status, headers, body)), captured
   requests, reset in tearDown, and a helper that builds an `APIClient`/URLSession using it (APIClient already takes a session — check APIClient.swift).
   Migrate the existing copies to it where it is a mechanical change; leave any that need behaviour changes and list them.
2. Add `Tests/DflhSafV2SwiftTests/Support/Fixtures.swift`: loads JSON files from a test-bundle `Fixtures/` folder (add it to project.yml as test
   resources) and decodes with the app's real decoder configuration. Include one sample fixture + test that decodes an existing DTO
   (e.g. the public settings payload) so the pattern is proven. These fixtures will later be replaced by backend-generated golden files (PLAN L3).
3. Add `scripts/test-coverage.sh`: runs the unit tests with `-enableCodeCoverage YES -resultBundlePath build/coverage/Unit.xcresult`
   and prints `xcrun xccov view --report --only-targets` plus a per-folder summary for Sources/App (Feature/*, Network, AppState.swift, DesignSystem).
   Exit non-zero if tests fail. Document it in docs/operations or README briefly.

Verify: unit tests all pass (report count), `bash scripts/test-coverage.sh` runs and prints the summary (paste the totals into your report). Commit.
