# TS05 — Workspace: one command to run every test suite with coverage

Repo: umbrella (workspace root, tracked path docs/test-strategy/ only). Branch: `test/ts05-test-all` in the umbrella repo.
Run only after TS02, TS03 and TS04 are merged into their repos' main.

Add docs/test-strategy/test-all.sh that runs, in order, and continues past failures while recording them:
- backend: dflh-saf-v2/backend/scripts/test-coverage.sh
- android: the TS03 unit test + Kover task (ANDROID_HOME from fastlane/.env.default, reading only that variable)
- ios: dflh-saf-v2-swift/scripts/test-coverage.sh
Flags: --only backend|android|ios, --docker (sets DFLH_DOCKER_TESTS=1). Writes a markdown summary to docs/test-strategy/logs/summary-<date>.md
(pass/fail per suite, test counts, coverage totals) and exits non-zero if any suite failed. Update PLAN.md §4 statuses you can verify.

Verify: run it fully once and paste the summary. Commit in the umbrella repo.
