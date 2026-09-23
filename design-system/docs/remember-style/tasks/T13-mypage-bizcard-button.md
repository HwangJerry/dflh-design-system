# T13 — 내정보 profile section: keep "내 명함" as a business-card image viewer, remove "동문에게 보이는 화면" (Android + iOS)

Scope: dflh-saf-v2-kotlin app/src/main/kotlin/com/dflh/app/feature/profile/ui (ProfileScreen.kt, ProfilePreview.kt,
tests) and dflh-saf-v2-swift Sources/App/ProfileView.swift (+ Feature/Profile, tests/UITests). Nothing else.

User decision (2026-09-23), supersedes any earlier note about removing both buttons:
1. REMOVE the "동문에게 보이는 화면" button.
2. KEEP a single full-width secondary button (44px, r8, outlined, SPEC §4.12) in its place, labelled "내 명함",
   with the card icon. Tapping it opens the user's registered business-card image (UserProfileDTO.usrBizCard /
   Android profile model biz card URL) in a full-screen image viewer (dimmed background, pinch-zoom if a shared
   component already offers it, close button with accessibility label "닫기"). Reuse the existing alumni business
   card viewer/expand flow if one exists (AlumniBusinessCard / 명함 보기 on the detail screen) rather than writing
   a new viewer.
3. When no business card is registered: label the same button "명함 등록" and route to the existing profile edit
   screen (the BusinessCardEditor / biz card upload row). Do not show a disabled button.
4. Keep the pen (프로필 수정) button, bio, tags, contact rows and settings rows unchanged. Delete now-unused
   handlers/strings for the removed button; update/add tests, previews and accessibility identifiers.

Verify: Android `./gradlew :app:assembleDebug testDebugUnitTest` and `npm run verify-android-design-system`;
iOS xcodebuild per AGENTS.md and `npm run verify-ios-design-system`; `npm run verify-design-system` at the root.
Commit in each mobile repo.
