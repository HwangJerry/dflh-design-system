# iOS and Android authentication: remaining-issue review

**Superseded in part at 18:06 KST:** Android authentication fixes are now merged into `main` (`00b8f26`). The logout UI ordering defect remains. See the [latest re-review](auth-cross-platform-rereview-2026-10-10.md) for current conclusions and newly executed checks. The branch-integration finding below describes the 11:40 review state.

Reviewed on 2026-10-10, from 11:40 KST. Android still needs work. No remaining critical authentication defect was confirmed in the reviewed latest iOS implementation. This conclusion combines current source inspection, newly executed focused checks, and independently inspected saved device-test results. Fresh device and production DB verification were blocked in this session.

## Source and installation boundaries

| Component | Current source | Relationship to tested version |
| --- | --- | --- |
| Android development checkout | `dflh-saf-v2-kotlin`, `feature/alumni-multi-select`, `f2f5996` | Does **not** contain authentication fix `c0490c3` or its preceding QA fixes |
| Android previously tested candidate | `build/auth-final-hardening-20261009/android`, `fix/auth-logout-outbox-20261009`, `c0490c3` | Last verified installed QA APK. Current installed APK could not be read again |
| iOS | `dflh-saf-v2-swift`, `main`, `c0bb5c0` | Matches the final source in the latest iOS regression report |
| Shared server | `dflh-saf-v2`, `464ddda` | Matches the latest iOS deployment report; running production binary was not rechecked now |

All inspected product worktrees had no tracked changes. No product source, production configuration, account, or deployment was changed by this review.

## Confirmed remaining Android work

### P1 — tested authentication fixes are absent from the development checkout

The ancestry check `git merge-base --is-ancestor c0490c3 HEAD` fails in the Android development checkout. The authentication source differs across 15 files. Building that checkout would bring back previously corrected behavior even though a corrected QA APK was installed earlier.

Concrete examples in the current checkout:

- `SessionRepository.kt:28`: bootstrap catches a temporary network failure and clears the stored login, instead of preserving it and presenting retryable connectivity state.
- `SessionRepository.kt:188`: social signup cancellation only clears local state and does not cancel the server continuation.
- `SessionRepository.kt:198`: logout waits for the remote request before clearing local credentials and has no durable retry queue.
- The operation-generation guards and signup commit/login-recovery changes in the QA candidate are also absent.

This is an integration/release gap, separate from the last installed QA APK's behavior. Incorporate the reviewed authentication changes into the maintained Android branch while preserving the newer alumni-filter changes, then build and verify that resulting source. The earlier reports' passing candidate tests do not establish that this development checkout is safe to ship.

### P1 — logout UI waits for push unregistration before ending the local session

This issue remains even in the corrected Android QA candidate. In `MainActivity.kt:581`, `signOutWithPushUnregister` awaits `pushDeviceRepository.unregisterDeviceToken(token)` and only then calls `onSignOut()`. The development checkout has the same ordering at `MainActivity.kt:577`.

With an existing push token and a slow or unreachable push endpoint, confirmed logout has not yet reached local credential clearing or the logout outbox. Killing the process during that wait can leave the old stored login available on restart. The HTTP client uses 20-second connection/read/write timeouts, so an unavailable connection can create a meaningful window; an exact device delay was not measured now.

A diagnostic extracted the actual production callback unchanged and executed it with a suspended push dependency. It observed:

```text
localLogoutBlockedUntilPushCompletes=true
localLogoutAfterPushCompletion=true
```

This reproduces the ordering defect with a controlled coroutine dependency. It is not a newly performed physical process-kill test. The 18 replayed repository/token tests pass because they exercise session behavior below this UI callback.

End local authentication and durably capture cleanup first. Perform push/session cleanup afterward using the original session's credentials and ownership. The latest shared server already offers refresh-proof termination with explicit confirmation; the corresponding iOS flow clears local state before network cleanup. Add a regression covering a suspended push unregister and process restart, then verify the integrated APK on the device with a real stored push token.

## Shared social-login UX observation

Explicitly disconnecting a social login preserves its canonical identity ownership while the member exists. Reconnecting it to the same member is allowed; creating another member with that identity is deliberately blocked. Android device QA previously observed a new signup form followed by a final-submit 409 with “이미 다른 계정에 연결된 소셜 계정입니다. 다시 로그인해주세요.”

The strict ownership policy remains in `backend/internal/repository/account_connections_repo.go:49`. It should not be bypassed by transferring identities or deleting another member's data. A remaining UX improvement is to detect that reserved identity earlier and guide the user to the existing member's ID/PW login and reconnection. Android has direct device evidence for the late rejection; equivalent iOS presentation was not newly reproduced in this review.

## iOS status

The latest report supersedes the earlier iOS findings. Current source contains the disconnect-confirmation ordering fix, session-generation guards, signup cancellation/recovery handling, and persistent logout cleanup. `AppState.swift:1055` prepares and clears the old local session, transitions to signed out, and then performs push/server cleanup. Deferred refresh-proof logout requires an explicit committed server confirmation.

Independently reading the final XCResult confirmed **716 passed / 0 failed / 0 skipped**. Eight additional saved device bundles inspected here each contain one passing test and no failures. They cover native login/logout, offline logout recovery, actual expired-access global logout, fresh native signup, administrator approval, subsequent login/logout, withdrawal, and offline Kakao recovery/relinking. These are previously executed results, not newly rerun iPhone tests, and overlapping counts are not added together.

The latest iOS report also records actual Apple authentication, identity connection/disconnection/reconnection, cancellation and restart, and same-member login. Saved production observations show iOS QA requests **28 and 29 completed**, at approximately 07:23 and 07:30 KST respectively. Old descriptions saying those iOS withdrawal tests remain pending are superseded.

No new critical iOS defect was confirmed in this reviewed scope. That is not a guarantee for every untested condition or the App Store build. Actual iOS SMS delivery/autofill and real APNs delivery after logout are not established by this evidence. Android's successful actual SMS verification validates the shared sending path but does not substitute for iOS-specific input/autofill verification.

## Checks executed now

| Check | Result | Practical scope |
| --- | --- | --- |
| Latest shared-server focused tests | 58 leaf cases passed, 0 failed/skipped | Deferred logout confirmation/atomic failure/replay, push session ownership, social cancellation races, password golden policy; mock repositories and handlers |
| Android production-callback diagnostic | Logout blocking reproduced | Actual callback body with a controlled suspended push dependency |
| Android cached JVM test replay | 18 passed | Previously compiled QA-candidate logout outbox and token manager tests; no Gradle rebuild or fresh APK |
| Saved iOS final full XCResult | 716 passed, 0 failed/skipped | Prior final implementation test run inspected now |
| Saved iOS focused device XCResults | Eight passing bundles inspected | Previously executed physical-device scenarios listed above |

The focused server checks do not recreate actual provider/DB failures in production. Existing disposable-MariaDB and device evidence for signup consent/phone-proof atomicity remains in the earlier reports.

## Current verification limits and Android withdrawal follow-up

- ADB could not start its local listener: `Operation not permitted`.
- CoreDevice initialization timed out; the iOS Device Runner also encountered unavailable CoreSimulator services and denied cache writes under this session's sandbox.
- The read-only production SSH attempt was denied: `Operation not permitted`. Consequently, no current DB status or running binary was established.
- The old Android withdrawal monitor's saved output is stale. The newest saved manual snapshot is **01:35:54 KST**, and process liveness could not be inspected under the current restrictions. It must not be represented as verified ongoing monitoring.
- In that last snapshot, Android requests **24/25/26** were `processing/database_erased`, with cleanup estimates **2026-10-11 01:36–02:35 KST**. Those estimates are still in the future at review time, but the current request states were not read again. Real SMS authentication was already verified; actual member/identity/service-session deletion was also verified before that snapshot.

The old monitor additionally assumes iOS QA member 12820 must remain present. The separate, authorized iOS QA later withdrew that member successfully. A resumed cross-platform verifier should preserve the root account, recognize legitimate QA lifecycle changes, and avoid treating that authorized iOS cleanup as an authentication defect.

## Evidence

Current review artifacts are in `build/auth-cross-platform-review-20261010/`: `source-status.json`, `server-auth-tests.jsonl`, `server-auth-test-summary.json`, `android-callback-result.txt`, `android-cached-junit-result.txt`, `ios-saved-xcresult-summary.json`, and `review-summary.json`.

Related reports: [latest iOS regression](ios-auth-device-regression-2026-10-10.md), [Android fixes and device QA](auth-final-hardening-2026-10-09.md), [Android administrator follow-up](auth-admin-followup-2026-10-10.md), and [withdrawal completion snapshot](auth-erasure-completion-2026-10-10.md). Private credentials, OTPs, provider identifiers, contacts, and device Keychain contents were not included in this report.
