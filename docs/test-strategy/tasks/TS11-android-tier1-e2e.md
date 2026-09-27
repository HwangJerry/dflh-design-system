# TS11 — Android: Tier 1 E2E against the local backend stack

Repos: dflh-saf-v2-kotlin (branch `test/ts11-android-e2e`), plus only-if-needed seed additions in dflh-saf-v2 (branch `test/ts11-e2e-seed`).

Context:
- Local backend (TS09, on dflh-saf-v2 main): `dflh-saf-v2/e2e/local-backend/{up,down,reset,smoke}.sh`, emulator URL http://10.0.2.2:18080,
  DB on 127.0.0.1:13306, seed accounts and signup number documented in its README (e2e_member / e2e_pending / e2e_friend,
  password Synthetic-password-09!, signup phone 01000000002 code 654321).
- Android already allows cleartext in debug (app/src/debug/AndroidManifest.xml) and takes the API URL from the Gradle property
  DFLH_API_BASE_URL. Existing instrumented tests gate themselves with `assumeTrue(BuildConfig.DFLH_API_BASE_URL == ...)` — follow that
  pattern with http://10.0.2.2:18080 so these tests never run against production.
- AVDs available: Medium_Phone_API_36 (use it), others exist. ANDROID_HOME from fastlane/.env.default (that one line only).

Do:
1. Add `scripts/e2e-android.sh` in dflh-saf-v2-kotlin: resets the local stack (calls ../dflh-saf-v2/e2e/local-backend/reset.sh), boots the
   emulator headless if none is running (wait for boot), runs `./gradlew :app:connectedDebugAndroidTest -PDFLH_API_BASE_URL=http://10.0.2.2:18080`
   filtered to the E2E test package, then stops the stack (keep it with --keep). Refuse to run if the URL is not the local one.
   A KAKAO_NATIVE_APP_KEY placeholder is acceptable for debug builds if the build requires one — never read real keys.
2. Instrumented E2E tests (package com.dflh.app.e2e, full MainActivity via createAndroidComposeRule, real network to the stack):
   - login_approvedMember_reachesMainTabs_andSessionSurvivesRelaunch (ID login with e2e_member; main tabs visible; recreate activity → still signed in)
   - login_wrongPassword_showsError
   - signup_withSmsVerification_endsPending (native ID signup through every step with 01000000002/654321, consent checkbox, submit → pending
     status screen; then the reviewer-style pending state is shown on relaunch)
   - pendingMember_loginShowsPendingStatus (e2e_pending)
   - accountDeletion_requestSignsOutAndShowsReceipt (log in as a disposable approved member — add one to seed.sql in dflh-saf-v2 if needed,
     e.g. e2e_delete; request deletion from 내정보 > 계정 설정; app signs out; receipt status reachable)
   - forceUpdate_blocksApp: before this test the script (or the test via a small host-side step run by the script) sets
     app_update_policy_android to force with minBuild above the debug versionCode in the local DB, then the app shows the force-update
     screen. NOTE debug builds send no version headers (D13), so the in-app gate may not trigger in debug — if so, test what is testable
     (policy fetch + gate evaluation) and explain precisely; do not change D13 behaviour.
   Use stable test tags/semantics already present; add test tags to production composables only where none exist (no visual change).
   Tests must be independent: the script resets the stack before the run; tests that mutate state use their own accounts.
3. Add the E2E run to docs/operations/UNIT_TESTS.md (or a new E2E.md) and note it is required before production promotion (PLAN D5).

Verify: `scripts/e2e-android.sh` passes all E2E tests on Medium_Phone_API_36 (paste the summary); `:app:testDebugUnitTest` still passes
(baseline 429); local stack left stopped. Commit in each repo you touched.
