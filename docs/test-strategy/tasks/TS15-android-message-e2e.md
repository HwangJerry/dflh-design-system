# TS15 — Android: message (쪽지) E2E against the local backend

Repo: dflh-saf-v2-kotlin (branch `test/ts15-android-message-e2e`); seed additions only if needed in dflh-saf-v2 (branch `test/ts15-e2e-seed`).

Context: the Tier 1 suite and runner exist (app/src/androidTest/kotlin/com/dflh/app/e2e/TierOneE2ETest.kt, scripts/e2e-android.sh —
read both and reuse their guards, helpers and runner; do not use ripgrep in scripts). Local stack seed (dflh-saf-v2/e2e/local-backend/
seed.sql) already has members e2e_member(100) and e2e_friend(102) and a two-message thread between them (ALUMNI_MESSAGE 800/801).
The backend has a realtime message stream (SSE) the app subscribes to.

Do:
1. Add `MessageE2ETest` (same package and gating) with:
   - conversationList_showsSeededThread_withUnreadBadge (log in as e2e_member; 쪽지 tab shows the thread with e2e_friend and the unread state)
   - openThread_marksRead_andShowsHistory (open it; both seeded messages visible; unread badge clears; server read state updated —
     verify through the API with the member's token or by re-login, not by peeking at the DB unless no API exists)
   - sendMessage_appearsInThread_andForRecipient (send a message; it appears as sent; log in as e2e_friend (or query the API as friend)
     and see it)
   - newConversation_fromCompose (새 쪽지: pick a recipient via search, send, the new thread appears)
   - realtime_incomingMessage_appearsWithoutRefresh (while e2e_member views the thread, send a message as e2e_friend via the API from
     the test using a token obtained by the test itself; it appears in the open thread without manual refresh). If SSE cannot be exercised
     reliably on the emulator, explain precisely and keep the test with a documented skip rather than a flaky pass.
   - block_preventsSending (block from the conversation menu; sending is blocked or the UI shows the blocked state; unblock restores)
   Tests must be independent (the runner resets the stack); add seed rows (e.g. an extra friend) if needed for isolation.
2. Extend scripts/e2e-android.sh to run both E2E classes (or a flag to choose), keeping the existing guards.
3. Update docs/operations/UNIT_TESTS.md E2E section.

Verify: scripts/e2e-android.sh passes all Tier 1 + message E2E on Medium_Phone_API_36 (paste summary; the iOS simulator may also be
running on this machine — keep the emulator settings the runner already uses); `:app:testDebugUnitTest` still passes (baseline 429);
stack and emulator left stopped. Commit in each repo you touched.
