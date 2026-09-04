# Token Lifecycle

Tokens are the editable source for cross-platform visual decisions.

## Editable Source

Only edit:

- `design-system/tokens/design-tokens.json`
- `design-system/tokens/design-tokens.schema.json` when schema rules change
- `design-system/tokens/TOKEN_INVENTORY.md` when token families or policy
  change

Do not edit generated platform files by hand.

## Generated Outputs

- Web: `design-system/platform/web/design-tokens.css`
- iOS: `design-system/platform/ios/DesignTokens.swift`
- Android: `design-system/platform/android/DesignTokens.kt`
- Copied iOS app token file:
  `dflh-saf-v2-swift/Sources/App/DesignSystem/DesignTokens.swift`
- Copied Android token file:
  `dflh-saf-v2-kotlin/design-system/src/main/kotlin/com/dflh/designsystem/DesignTokens.kt`
- Manifest: `design-system/platform/manifest.json`

## Change Flow

1. Propose the token with a product meaning, target family, and platform usage.
2. Add or update the token in `design-tokens.json`.
3. Validate schema and naming.
4. Generate platform artifacts.
5. Verify generated artifacts are fresh.
6. Update platform UI usage and contract evidence.
7. Capture visual evidence when the token changes user-visible UI.

## Commands

```bash
npm run validate-design-tokens
npm run generate-design-system
npm run verify-generated-design-system
npm run verify-design-system
```

Use the full gate when visual baselines are part of the change:

```bash
npm run verify-design-system:full
```

## Figma as the origin of a token change

If a token value originates from a designer edit in Figma (the "DFLH Design Tokens" file) rather
than a direct JSON edit, follow `docs/FIGMA_SYNC.md` instead of hand-editing the value: pull the
Figma variables, run the import script, then continue from step 3 of the change flow above
(validate → generate → verify).

## Acceptance Criteria

- The token name follows schema rules.
- The token has a clear product meaning.
- Generated artifacts match the canonical JSON.
- Web, iOS, and Android consumers use generated tokens or DS aliases.
- Any intentional platform difference is documented before merge.

