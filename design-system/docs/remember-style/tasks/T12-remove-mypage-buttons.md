# T12 — 내정보: remove the "내 명함" and "동문에게 보이는 화면" buttons (Android + iOS)

Scope: dflh-saf-v2-kotlin app/src/main/kotlin/com/dflh/app/feature/profile/ui (ProfileScreen.kt, ProfilePreview.kt,
tests) and dflh-saf-v2-swift Sources/App/ProfileView.swift (+ tests/UITests). Nothing else.

User decision (2026-09-23): the profile section on 내정보 must NOT show the two secondary buttons "내 명함" and
"동문에게 보이는 화면". Remove the button row entirely (and the spacing that separated it) so the profile section ends
with the tag chips. Keep the pen (프로필 수정) button, bio, tags, contact rows and settings rows unchanged. Delete
now-unused handlers/state/strings and update or remove tests, previews and accessibility identifiers that referenced
those buttons. SPEC §5.6 and MyPage.dc.html are being updated separately to match.

Verify: Android `./gradlew :app:assembleDebug testDebugUnitTest` and `npm run verify-android-design-system`;
iOS xcodebuild per AGENTS.md and `npm run verify-ios-design-system`; run `npm run verify-design-system` at the root
(contract evidence must stay valid). Commit in each mobile repo.
