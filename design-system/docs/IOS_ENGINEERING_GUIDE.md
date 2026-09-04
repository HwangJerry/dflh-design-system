# iOS Engineering Guide

This guide is for contributors working in `dflh-saf-v2-swift`.

## Required Sources

- Canonical tokens: `design-system/tokens/design-tokens.json`
- Generated Swift source: `design-system/platform/ios/DesignTokens.swift`
- Copied app token source:
  `dflh-saf-v2-swift/Sources/App/DesignSystem/DesignTokens.swift`
- Swift helpers:
  `dflh-saf-v2-swift/Sources/App/DesignSystem/DSComponents.swift`
- Contracts: `design-system/contracts/component-contracts.json`

## Usage Rules

- Use `DSColor`, `DSTextStyle`, `DSSpace`, `DSRadius`, `DSCard`, `DSLayout`,
  `DSLineWidth`, `DSOpacity`, `DSFontWeight`, and related helpers for UI
  styling.
- Semantic `DSColor` values declared in `colorSchemes` automatically follow the
  current iOS light/dark appearance; consumers should keep using the existing
  token properties without branching on `ColorScheme`.
- Keep Feed, Messages, and My Page aligned with `screen.feed`,
  `screen.messages`, and `screen.myPage`.
- Do not use direct SwiftUI semantic colors/fonts, bare `.padding()`, hardcoded
  `cornerRadius`, hardcoded opacity values, or ad-hoc material backgrounds in
  mandatory screen evidence files.
- Safe-area differences are allowed at app shell and navigation boundaries when
  documented.

## Adding Or Changing UI

1. Identify the primitive or screen contract.
2. Use `DSComponents.swift` helpers before creating a new local visual helper.
3. Map every color, font, spacing, radius, opacity, line width, and layout value
   to a generated token.
4. Update contract implementation evidence if covered screen files move.
5. Run verification from the workspace root.

For the planned Instagram-style authenticated bottom navigation, follow
`docs/IOS_INSTAGRAM_STYLE_TAB_MENU_PLAN.md` and treat the work as a
`navigation` primitive variant before changing app screens.

```bash
npm run verify-design-system
npm run visual-check-ios
```

## Review Checklist

- No generated Swift token file was edited manually.
- UI styling resolves through DS helpers or copied generated tokens.
- Required loading, empty, error, data, editing, and signed-out states are
  handled where the contract requires them.
- Intentional iOS-only differences are documented in the accepted delta log or
  visual decision log.
