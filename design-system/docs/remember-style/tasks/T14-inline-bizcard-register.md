# T14 — 내정보 "명함 등록": pick an image and register the business card inline (Android + iOS)

Scope: dflh-saf-v2-kotlin feature/profile (ProfileScreen.kt, its view model, BusinessCardEditor.kt, previews, tests)
and dflh-saf-v2-swift ProfileView.swift + Feature/Profile (+ tests/UITests). Nothing else.

User decision (2026-09-23): tapping "명함 등록" on 내정보 must NOT navigate to the profile edit screen. It starts the
registration flow in place:
1. Open the system image picker immediately (Android: the existing PickVisualMedia ImageOnly launcher used by
   BusinessCardEditor; iOS: PhotosPicker, images only, single selection).
2. Show the existing confirmation step as a bottom sheet over 내정보 (Android: reuse BusinessCardConfirmation with
   preview, 다시 선택, 등록; iOS: build the equivalent sheet with DS components: preview of the picked image on
   `paperAlt`, secondary "다시 선택", primary "등록"). Cancelling leaves the profile unchanged.
3. On 등록: upload with the existing biz-card upload path (Android view model upload used by the edit screen; iOS
   `uploadBizCard` in ProfileView/AppState), persist it to the profile the same way the edit screen does (the profile
   update request that carries usrBizCard), then refresh the profile so the button flips to "내 명함" and the viewer
   shows the new image. Show a loading state on the 등록 button while uploading and an inline error with 다시 시도 on
   failure (reuse existing error strings/patterns).
4. Keep "내 명함" (viewer) behaviour from T13. The edit screen's own biz-card row stays as it is.
5. Extract the shared pick → confirm → upload logic so the edit screen and 내정보 use one implementation (view model /
   controller), rather than duplicating it.
6. Tests: unit tests for the flow states (picked, uploading, success flips label, failure), and update/add UI tests.

Verify: Android `./gradlew :app:assembleDebug testDebugUnitTest` + `npm run verify-android-design-system`;
iOS xcodebuild per AGENTS.md + `npm run verify-ios-design-system`; `npm run verify-design-system` at the root.
Commit in each mobile repo.
