# TS09 — Backend: local docker compose stack for mobile E2E (production-shaped, synthetic data)

Repo: dflh-saf-v2. Branch: `test/ts09-local-e2e-stack`. Work in a new folder `e2e/local-backend/` (plus README link from backend docs).

Goal (PLAN D2/L5): one command brings up a local backend that the iOS simulator (http://localhost:18080) and the Android emulator
(http://10.0.2.2:18080) can use for E2E tests, with the production schema and synthetic seed data. Nothing here may ever point at production.

1. `e2e/local-backend/compose.yaml` with:
   - `db`: the pinned MariaDB image from backend/migrations/testdata/mariadb-10.1.38.image (use the digest), started with the same server
     options the test harness uses (see prodServerOptions in backend/internal/testsupport/mariadb/container.go: Barracuda, large prefix,
     sql_mode), bound to 127.0.0.1 only, no host volume for data (throwaway). Init via /docker-entrypoint-initdb.d: the baseline schema
     (backend/migrations/testdata/prod_baseline_schema_20260927.sql), its applied-migrations file, any repo migration newer than 077
     (none today — make the init step apply files not already in _migration_history so it keeps working), then `seed.sql`.
   - `api`: built from backend/Dockerfile (read it; adjust only via build args/compose, not by changing the Dockerfile unless required —
     if required, keep production behaviour identical and explain), env from `local.env` committed with synthetic values only
     (JWT secret, erasure keys as throwaway hex, SMS provider empty, SMS_REVIEW_TEST_PHONES/CODE for the E2E signup number,
     PUSH_ENABLED=false, upload/audit paths inside the container, SITE_BASE_URL suitable for local, CORS for local), published on
     127.0.0.1:18080. Healthcheck.
   Reuse the env set the TS07 golden harness uses (backend/cmd/server/golden_harness_test.go) as the reference for a valid minimal config.
2. `seed.sql` (synthetic only, documented in README): an approved member for login E2E (e.g. e2e_member / a documented password stored with the
   same hashing the backend uses — generate the hash with the backend's own code/tool, not by hand), a pending member, an alumni roster entry
   usable for a new signup, a couple of feed posts and a message thread so Tier 2 E2E has data, app_update policies OFF by default.
   The E2E signup phone number and code are documented (use 01000000002 / 654321, distinct from TS07).
3. Scripts: `up.sh` (build + start + wait healthy + print URLs and seed accounts), `down.sh` (stop and remove volumes), `reset.sh`
   (down+up), `smoke.sh` (curl: settings/public, mobile login with the seed member, /api/auth/me with the token, check-phone for the
   signup number → available). All must refuse to run if any URL/env points at daeilfoundation.or.kr.
4. README: prerequisites, commands, seed accounts, how the apps point at it (iOS: DFLH_API_BASE_URL launch env in Debug — TS01;
   Android: a build property/flavor is future work in TS11, just note the URL), and the rule that data is synthetic and throwaway.

Verify: `e2e/local-backend/up.sh` then `smoke.sh` pass on this machine (Docker is available); `down.sh` leaves no containers/volumes;
`go test ./...` in backend still passes. Paste smoke output (without tokens). Commit.
