# Native login: single-surface landing

The user approved the [light proposal](https://www.figma.com/design/6XaX36E3p7uGWo0WMNYzX1?node-id=73-2) and [dark proposal](https://www.figma.com/design/6XaX36E3p7uGWo0WMNYzX1?node-id=73-82) on 2026-10-10.

The iOS and Android login landing now uses one continuous theme-aware background. A 72-point school crest sits above two centred title lines. The helper connects the title to the login actions, which use 52-point minimum heights, 14-point corners, and 12-point gaps. The credentials action uses a white light-mode surface and the dark paper surface. Kakao remains yellow. iOS retains the native Apple button, switching from black to white when the appearance changes.

The help link sits above the bottom safe area when there is enough vertical space. Short windows and larger text sizes use a scrollable column with smaller decorative gaps. Width is bounded at 390 points, with fold-aware placement on Android. Login routes, provider callbacks, submission disabling, accessibility identifiers, and the reserved error slot remain in place.

New visual values are scoped login tokens in the canonical design system. Existing input sizing and status-screen emblem tokens retain their values. Web login is outside this native-only change; generated token definitions are synchronized across consumers.

## Validation

- iOS simulator build: passed. The existing credentials-entry UI test passed on iPhone 17 / iOS 26.
- Android debug app and instrumentation APK builds: passed. Four existing login tests passed: Kakao callback, submission disabling, credentials entry, and configured account-help URL.
- Shared design-system verification and the existing iOS visual regression guard: passed.
- Actual light/dark screenshots reviewed on both platforms, including changing appearance while the login screen is open. The iOS Kakao content uses an explicit, Dynamic Type-scaled height to remain visible across appearance changes.
- iOS accessibility-large text and Android font scale 1.5 reviewed: headings, helper, login actions, and help remain readable.

Local screenshots are in the ignored `output/login-unified-implementation-20261010/` directory: `ios-light.png`, `ios-dark.png`, `android-light.png`, `android-dark.png`, and large-text captures. iOS uses the debug login fixture; Android captures the running app landing. Real provider authorization was not exercised by this visual-only change.
