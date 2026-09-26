# TS01 — iOS: stop the unit-test host from booting the real app; allow a local backend URL in Debug

Repo: dflh-saf-v2-swift. Branch: `test/ts01-test-host-guard`.

Problem (verified): unit tests run inside the app host. `DflhSafV2SwiftApp` (Sources/App/DflhSafV2SwiftApp.swift:7) always creates
`AppState()`, whose init starts `bootstrapSession()` and `refreshAppSettings()` (AppState.swift ~289-295) against the production URL
from Config/Config.xcconfig. AppDelegate also configures Sentry/APNs. Only PushNotificationCoordinator checks XCTest.

Do:
1. Add one small, named helper (e.g. `AppLaunchEnvironment.isRunningUnitTests`) that detects the XCTest host
   (XCTestConfigurationFilePath env / NSClassFromString("XCTestCase")) — but NOT UI tests (XCUITest launches the app normally and must keep working).
2. When running unit tests, the app host must not bootstrap the session, refresh settings, start realtime/push/Sentry, or touch Keychain.
   Prefer: `DflhSafV2SwiftApp` builds `AppState(automaticallyBootstrapSession: false, ...)` (the init already has this flag — check) and renders an
   empty view; AppDelegate skips Sentry/APNs setup. Reuse the helper in PushNotificationCoordinator instead of its inline check.
3. Base URL: in `AppConfig.resolvedBaseURL` (AppConfig.swift ~69), for DEBUG builds only, let the `DFLH_API_BASE_URL` launch environment variable
   override the Info.plist value (release keeps Info.plist only). Keep existing localhost handling. Add an ATS exception for `localhost`/`127.0.0.1`
   that applies to Debug only (e.g. a Debug-only Info.plist key via build setting, or NSAllowsLocalNetworking which only affects local hosts — choose the
   least permissive option and explain it). Release Info.plist must not gain arbitrary-loads.
4. Unit tests: cover the helper and the DEBUG override precedence (inject env/bundle values; do not rely on process env).

Verify: `xcodebuild test -project dflh-saf-v2-swift.xcodeproj -scheme DflhSafV2Swift -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:DflhSafV2SwiftTests`
(all pass; report count, baseline 271) and the Debug build command in AGENTS.md. Confirm with a short note how you verified no network
request is issued at test start (e.g. a URLProtocol spy registered in a test, or reasoning from code). Commit.
