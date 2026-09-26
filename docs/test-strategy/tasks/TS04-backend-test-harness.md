# TS04 — Backend: reusable MariaDB 10.1.38 test harness + golden-fixture normalization helper

Repo: dflh-saf-v2 (work in backend/). Branch: `test/ts04-test-harness`.

Context: Docker MariaDB start/DSN/cleanup logic exists but is private to package repository
(e.g. startPasswordResetMariaDB101 in internal/repository/password_reset_mariadb_integration_test.go ~101, and the isolated-container pattern in
isolated_erasure_mariadb_test.go). Each test starts its own container. The pinned image is migrations/testdata/mariadb-10.1.38.image (read how it is used).

1. Create `internal/testsupport/mariadb` (build tag or `_test`-free package usable from any package's tests): start ONE MariaDB 10.1.38 container per
   `go test` package run (sync.Once / TestMain helper), return a handle that creates a fresh database per test (`CREATE DATABASE t_<random>`, dropped in
   t.Cleanup) and gives an *sqlx.DB/DSN. Skip with t.Skip when Docker is unavailable or when an opt-in env var (e.g. DFLH_DOCKER_TESTS=1) is not set,
   matching how existing integration tests are gated. Apply a caller-supplied list of SQL files/statements to the fresh DB.
2. Migrate ONE existing Docker integration test (the smallest one) to use the harness, keeping its behaviour. Do not migrate all.
3. Create `internal/testsupport/golden`: helpers to (a) normalize JSON response bodies for golden files — replace timestamps (RFC3339 and
   `YYYY-MM-DD HH:MM:SS`), JWT/opaque tokens, and caller-listed volatile keys with stable placeholders, sort object keys, pretty-print; (b) compare
   against `testdata/golden/<name>.json` with an `-update` flag (env or `flag`) that rewrites the file. Unit-test the normalizer.
4. Add `backend/scripts/test-coverage.sh`: `go test ./... -coverprofile` with a per-package summary and total (Docker tests skipped by default;
   `DFLH_DOCKER_TESTS=1` to include them).

Do not attempt a full schema bootstrap from migrations (legacy base schema is missing — PLAN O1). Do not change production code.

Verify: `go vet ./...`, `go test ./...` (all pass), the migrated Docker test with Docker enabled if Docker is running (say if it is not),
and `bash scripts/test-coverage.sh` (paste total). Commit.
