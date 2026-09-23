# T01 — Palette + semantic tokens (design-system only)

Scope: design-system/ (tokens, schema, generator, validator, inventory doc) and the generated copies it writes into
dflh-saf-v2/frontend/src/generated, dflh-saf-v2-swift/Sources/App/DesignSystem/DesignTokens.swift,
dflh-saf-v2-kotlin/design-system/.../DesignTokens.kt. Do NOT change any screen or theme code in the apps beyond what
the generator writes, except the two theme palette wirings listed at the end.

1. Extend design-tokens.schema.json: new required root section `palette` = { light: hexMap, dark: hexMap } with the
   entries in SPEC §2 (same keys in both). Allow color values in `colors` and `colorSchemes.*` to be either a hex or an
   alias string matching `^\{palette\.[a-z][A-Za-z0-9]*\}$`.
2. Add the palette values and all semantic tokens from SPEC §2 to design-tokens.json (colors + colorSchemes.light/dark,
   aliases). Re-point existing tokens whose value equals a palette entry (e.g. primary→{palette.brandPrimary},
   warm→{palette.brandAccent}, surface, background, border, borderSubtle, textPrimary/Secondary/Tertiary, error…)
   WITHOUT changing their resolved hex in light mode. Add the sizing/layout/radius/typography metrics from SPEC §3
   (layout.screenPad.mobile becomes 20px). Bump version to 1.3.0.
3. Update validate-design-tokens.mjs and generate-platform-tokens.mjs to resolve aliases (light from palette.light,
   dark from palette.dark; a `colors` alias resolves against light). Generated web CSS additionally emits
   `--palette-*` variables; Swift and Kotlin additionally emit a `DSPalette` enum/object with light+dark values.
   Everything else in the generated files keeps its current shape so existing consumers compile.
4. Update tokens/TOKEN_INVENTORY.md and docs/TOKEN_LIFECYCLE.md with the palette/alias rule (short).
5. Theme wiring (minimal): in dflh-saf-v2-kotlin/design-system/.../DSTheme.kt replace the hardcoded dark hexes in
   DarkDSColors with the generated dark token values (DesignTokens now exposes them), and add the new semantic roles
   to DSColorPalette (light+dark). In iOS nothing extra is needed if DSColor gains the semantic names automatically.
6. Run at workspace root: npm run validate-design-tokens && npm run generate-design-system && npm run verify-design-system
   && npm run test-design-system-scripts. Then: (cd dflh-saf-v2-kotlin && ./gradlew :design-system:assembleDebug) and
   the iOS xcodebuild from dflh-saf-v2-swift/AGENTS.md. All must pass.
Commit in the umbrella repo (design-system + generated copies are tracked there? check `git status` in each repo and
commit wherever files changed).
