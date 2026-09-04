# Android Engineering Guide

This guide is for contributors working in `dflh-saf-v2-kotlin/design-system`
and future Android feature modules.

## Required Sources

- Canonical tokens: `design-system/tokens/design-tokens.json`
- Generated Kotlin source: `design-system/platform/android/DesignTokens.kt`
- Copied Android token source:
  `dflh-saf-v2-kotlin/design-system/src/main/kotlin/com/dflh/designsystem/DesignTokens.kt`
- Android helpers:
  `dflh-saf-v2-kotlin/design-system/src/main/kotlin/com/dflh/designsystem/DSComponents.kt`
- Compatibility aliases:
  `dflh-saf-v2-kotlin/design-system/src/main/kotlin/com/dflh/designsystem/DesignSystemCompat.kt`
- Screen maps:
  `dflh-saf-v2-kotlin/design-system/src/main/kotlin/com/dflh/designsystem/screens/`

## Usage Rules

- Consume the Android design-system package as the only visual style source for
  shared product UI.
- Import `DflhDesignSystem` or the focused screen maps:
  `FeedScreenDsMap`, `MessagesScreenDsMap`, and `MyPageScreenDsMap`.
- Use `DSAppShell`, `DSCard`, `DSButton`, `DSBadge`, `DSNavigation`,
  `DSTextStyle`, `DSSpace`, `DSOpacity`, `DSLineWidth`, and `DSAvatarColor`
  instead of raw Compose or Material visual values.
- Do not add raw `Color(...)`, hardcoded `.dp`/`.sp` style literals, one-off
  radius values, or local elevation constants in mandatory screen
  implementations.

## Adding Or Changing UI

1. Identify the primitive or screen contract.
2. Use target screen bindings such as `AndroidFeedTargetScreen`,
   `AndroidMessagesTargetScreen`, and `AndroidMyPageTargetScreen` when wiring
   contract-covered screens.
3. Map surfaces, typography, spacing, radius, states, and motion to DS values.
4. Update contract evidence when new Android implementation files become the
   authoritative screen files.
5. Run verification from the workspace root.

```bash
npm run verify-android-design-system
npm run verify-design-system
```

## Review Checklist

- Generated Kotlin token files were not edited manually.
- Contract-covered screen code imports DS maps or `DflhDesignSystem`.
- Required screen states are represented.
- Intentional Android-only differences are documented in
  `design-system/verification/reports/accepted-deltas.json`.

