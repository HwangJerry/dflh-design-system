# TS16 — Realtime (SSE) event contract goldens: backend → iOS + Android

Why: the Android realtime bug (fixed 2026-09-27, `1528631`/`c66c790`) went unnoticed for two months because TS07/TS08 goldens cover
REST responses only. Backend renamed SSE events in `8dcba0b` (2026-08-02); iOS followed, Android did not. This task makes such drift fail
a test in every repo.

Repos / branches:
- dflh-saf-v2 (backend/) — `test/ts16-realtime-goldens`
- dflh-saf-v2-swift — `test/ts16-realtime-contracts`
- dflh-saf-v2-kotlin — `test/ts16-realtime-contracts`
- umbrella docs/test-strategy — `test/ts16-golden-sync` (only if sync-golden.sh needs changes)

Context (read first): docs/test-strategy/PLAN.md; backend/internal/testsupport/README.md ("Tier 1 router goldens (TS07)");
backend/cmd/server/{golden_harness_test.go,tier1_golden_test.go}; backend/internal/service/message_notifier.go (event names/payloads);
backend/internal/realtime/hub.go (eventId) and backend/internal/handler/realtime_handler.go (SSE framing, ~line 100);
docs/test-strategy/sync-golden.sh; iOS Tests/.../BackendGoldenContractTests.swift + Support/BackendGolden.swift and
Sources/App/Feature/Message/MessageRealtimeModels.swift; Android app/src/test/kotlin/com/dflh/app/contract/{BackendGolden,BackendGoldenContractTest}.kt
and app/src/main/kotlin/com/dflh/app/feature/messages/realtime/MessageRealtimeModels.kt.

Do:
1. Backend (Docker-gated like TS07, `DFLH_DOCKER_TESTS=1`): in cmd/server add a golden test that, through the real router + production
   baseline DB, opens `GET /api/messages/stream` for two synthetic members (A and B), then: A sends B a message; B marks it read. Capture
   the raw SSE frames each member receives and store goldens:
   - `realtime_message_created` (B's stream), `realtime_conversation_updated_sender` and `realtime_conversation_updated_recipient`,
     `realtime_message_read` (A's stream), and `realtime_ready`.
   Store each as JSON `{ "event": "<name>", "data": <parsed data JSON>, "raw": "<exact SSE frame text, normalized>" }` so apps can test both
   the parsed payload and the raw framing (`id:`/`event:`/`data:` lines). Normalize volatile values (eventId, ids, timestamps) with the
   existing golden helpers, keeping field names and types intact. Run twice to prove stability. If the stream cannot be read in-process
   reliably, explain and fall back to capturing via the realtime hub subscription used by the handler — but prefer the real HTTP stream.
2. Sync: make sure `docs/test-strategy/sync-golden.sh` copies the new files into both apps (it copies *.json from the backend golden dir —
   verify) and `--check` passes.
3. iOS: contract tests that feed each golden's `raw` frames through the app's real SSE decoder (MessageRealtimeSSEDecoder /
   MessageRealtimeEventDecoder) and assert the decoded case and key fields (conversationUserSeq, messageId/throughMessageId).
4. Android: the same through `MessageRealtimeSseDecoder` (feed lines) and assert `MessageCreated` / `ConversationUpdated` / `MessageRead`
   / `Ready` with fields.
5. Prove the tests catch drift: temporarily change one event name in each app's decoder (or in a copy of a golden) and show the new test
   fails, then restore. Report that you did it.
6. Update docs: backend testsupport README golden table, each app's docs/operations/UNIT_TESTS.md contract section, PLAN.md log line.

Rules: see docs/test-strategy/tasks/_PREAMBLE.md (branch per task from main, never commit to main/release/*, no merge, no push, no secrets,
never contact production). End commits with: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>. Do NOT run the Android emulator or
the local E2E Docker stack (the TS04 MariaDB harness container for backend goldens is fine). Use the iPhone 17 simulator for iOS unit tests.
Run repos one at a time.

Verify: backend `go vet ./...`, `go test ./...`, `DFLH_DOCKER_TESTS=1 go test ./cmd/server -run 'Golden' -count=1` twice; `sync-golden.sh
--check`; iOS unit tests (baseline 407); Android `:app:testDebugUnitTest` (baseline 441). Report exact counts per repo, branch/commit hashes,
and the drift-proof results.
