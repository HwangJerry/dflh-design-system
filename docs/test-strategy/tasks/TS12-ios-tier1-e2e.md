# TS12 — iOS: Tier 1 E2E (XCUITest) against the local backend stack

Repo: dflh-saf-v2-swift (branch `test/ts12-ios-e2e`); seed additions only if needed in dflh-saf-v2 (branch `test/ts12-e2e-seed`).

Context:
- Local backend (dflh-saf-v2/e2e/local-backend, README has accounts): iOS simulator URL http://localhost:18080. Seed accounts
  e2e_member / e2e_friend / e2e_pending / the Android deletion account (see seed.sql), password Synthetic-password-09!, signup phone
  01000000002 code 654321. Add a separate disposable iOS deletion account to seed.sql if tests would otherwise collide with Android's.
- TS01 made Debug builds honour the `DFLH_API_BASE_URL` launch environment and allow http to localhost/127.0.0.1 in Debug only.
- The Android counterpart is dflh-saf-v2-kotlin/app/src/androidTest/kotlin/com/dflh/app/e2e/TierOneE2ETest.kt and scripts/e2e-android.sh
  (read both; mirror the scenarios and runner design, including the guards and cleanup). Do not use ripgrep (`rg`) in scripts — it is not
  installed everywhere; use grep.
- Existing UI tests: UITests/FigmaV4FlowTests.swift (mostly visual mode). Keep them working; do not use visual mode for E2E.

Do:
1. `scripts/e2e-ios.sh`: reset the local stack, boot "iPhone 17" simulator if needed, run only the E2E test class via
   `xcodebuild test -only-testing:DflhSafV2SwiftUITests/TierOneE2ETests` with the launch environment set by the tests, stop the stack
   (keep with --keep). Refuse to run if the URL is not http://localhost:18080. Erase/uninstall the app between runs so Keychain state from
   a previous run cannot leak (document how).
2. `UITests/TierOneE2ETests.swift` (launchEnvironment["DFLH_API_BASE_URL"]="http://localhost:18080" and an explicit E2E flag; skip unless the
   flag is set so normal UI test runs are unaffected):
   - login_approvedMember_reachesMainTabs_andSessionSurvivesRelaunch
   - login_wrongPassword_showsError
   - signup_withSmsVerification_endsPending ("아이디로 회원가입" flow, consent checkbox, 01000000002/654321 → 승인 대기)
   - pendingMember_loginShowsPendingStatus
   - accountDeletion_requestSignsOutAndShowsReceipt (own disposable account)
   - forceUpdate: Debug builds send no version headers and have no client identity (D13), so the gate does not apply in Debug. Mirror
     Android's approach only if it can be done without changing production behaviour; otherwise document it as covered by the backend 426
     golden (TS07) and unit tests, and skip with a clear reason.
   Add accessibility identifiers only where none exist (no visual change). Handle system alerts (notification permission) deterministically.
3. Document in docs/operations/UNIT_TESTS.md (E2E section).

Verify: `scripts/e2e-ios.sh` passes on iPhone 17 (paste summary); unit tests still pass (baseline 380); existing UI test target builds;
local stack left stopped. Commit in each repo you touched.
