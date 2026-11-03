# Design Token Inventory

Canonical source: `design-system/tokens/design-tokens.json`

Schema: `design-system/tokens/design-tokens.schema.json`

Validation command:

```bash
npm run validate-design-tokens
```

## Inventory

| Category | Shape | Usage intent | Generated targets |
| --- | --- | --- | --- |
| `palette` | Matching `light` / `dark` raw hex maps | Swappable brand, ink, paper, canvas, line, and feedback primitives from Remember-style SPEC §2. | CSS `--palette-*` (light); Swift / Kotlin `DSPalette.Light.*` and `DSPalette.Dark.*` |
| `colors` | Hex or `{palette.name}` alias map | Brand, surfaces, borders, text roles, feedback states, avatars, hero gradients, and platform status colors. Aliases resolve against `palette.light`. | CSS `--color-*`, Swift `DSColor`, Kotlin `DesignTokens.*` |
| `colorSchemes` | Matching `light` / `dark` semantic hex or alias maps | Aliases resolve against the matching palette scheme. Resolved light entries must match base `colors`; omitted roles retain their base light value in both appearances. | Trait-aware Swift `DSColor`; Kotlin `DesignTokens.Dark.*`; web keeps base light colors |
| `opacity` | Number map from `0` to `1` | Overlay, shadow, muted icon, divider, and surface/transparency strengths. | CSS `--opacity-*`, Swift `DSOpacity`, Kotlin `Opacity` |
| `typography` | Font family strings, pixel sizes and line heights, font weights | Shared font stacks, text scale, and font weights for readable cross-platform type. | CSS font / line-height variables, Swift `DSFont`, Kotlin `Typography` |
| `spacing` | Numeric pixel scale | General-purpose layout rhythm and component spacing. Numeric keys are the only allowed non-camel token names. | CSS `--spacing-*`, Swift `DSSpacing`, Kotlin `Spacing` |
| `radius` | Pixel radius map | Component corner radii, from compact controls to fully rounded pills. | CSS `--radius-*`, Swift `DSRadius`, Kotlin `Radius` |
| `sizing` | Pixel map, with nested platform-specific values where needed | Fixed component dimensions such as touch targets, headers, nav bars, composer height, badges, and hero bounds. | CSS `--size-*`, Swift `DSSizing`, Kotlin `Sizing` |
| `elevation` | Shadow string map | Card, nav, floating, hover, and glow depth styles. | CSS `--shadow-*`, Kotlin `Elevation`; iOS currently consumes equivalent component helpers |
| `iconography` | Pixel sizes and numeric line weights | Standard icon sizing and stroke weights for controls and status indicators. | CSS `--icon-*`, Swift `DSIcon`, Kotlin `Iconography` |
| `layout` | Pixel or ratio map, with nested responsive values | Page/container widths, gaps, content ratios, screen padding, and screen-specific spacing. | CSS `--layout-*`, Swift `DSLayout`, Kotlin `Layout` |
| `motion` | Duration and easing maps | Shared animation timings and easing curves for state transitions and staged feedback. | CSS `--motion-*`, Swift `DSAnimation`, Kotlin `AnimationMs` |
| `state` | Required state-name array | Canonical interaction and data states that contracts and components must account for. | Verification and contract checks |
| `platformMapping` | Metadata object | Documents generated formats, expected consumers, and platform usage notes. This is governance metadata, not a style token family. | Manifest and docs only |

## Schema Rules

- The root object is closed: no undeclared top-level sections are allowed.
- Required style-token families are `palette`, `colors`, `colorSchemes`, `opacity`, `typography`, `spacing`, `radius`, `sizing`, `elevation`, `iconography`, `layout`, `motion`, and `state`.
- Deprecated root sections `animation` and `semantics` are invalid; use `motion` and `state`.
- Token names use lower camelCase. `spacing` is the only category allowed to use numeric scale keys.
- Palette entries must be `#RRGGBB` or `#RRGGBBAA`, with the same keys in light and dark. Palette entries cannot themselves be aliases.
- `colors` and `colorSchemes.*` accept hexes or `{palette.<lowerCamelName>}` aliases to existing palette entries. Prefer aliases for matching palette colors; preserve resolved legacy light values when migrating.
- `colorSchemes.light` and `colorSchemes.dark` must contain matching semantic keys that also exist in `colors`; each resolved light value must match its resolved base `colors` value.
- Pixel values must include a `px` unit. Motion durations must use `ms`.
- Opacity values must be numbers from `0` through `1`.
- Font weights must be integer hundreds from `100` through `900`.
- `state.states` must include `default`, `hover`, `press`, `focus`, `disabled`, `loading`, `empty`, and `error`.
- Duplicate scalar values inside one root family are reported as warnings; explicit palette aliases and palette primitives are exempt.

Remember-style metrics use `sizing.listRowVerticalPad` (16px) for alumni and
`messageRowVerticalPad` (14px) for messages, `avatarHero` (80px) for detail,
and `tagChipHeight` (24px) for tags. Type variants are `meta` / `metaLg`
(13 / 14px), `caption` / `captionLg` (11 / 12px), and
`typography.lineHeight.body` (26px). Existing metrics retain their values except
the specified `layout.screenPad.mobile` change to 20px.

Calm states and forms (2026-09 UI/UX review, spec 0.3–0.5) use `colors.stateIcon`
(#767676), `statePullHint` (#9A9A9A) and `validationText` (#92400E), each with a
dark variant; `iconography.size.state` (40px); and the named type pairs
`typography.size` / `typography.lineHeight` `stateTitle` 16/24, `stateMessage`
14/20, `inlineStatus` 13/18 and `chipLabel` 14/20. Weights stay in the platform
text styles (iOS `DSTextStyle`, Android DS `TextStyle`s).

Entry flows and compose (spec B–D, G) add `colors.cautionSurface` /
`cautionBorder` (calm amber notice, light border #F3C66B) and `rejectionBorder`
(dark-safe), `opacity.failedBubble` (0.6), `sizing.signupPhoto` (140px),
`fullScreenLoader` (72px) and `composeMessageMinHeight` (220px),
`iconography.size.statusGlyph` (36px), and the type pairs `statusTitle` 20/28,
`statusMessage` 18/28 and `cardAction` 13/18. The 88px status circle reuses
`sizing.mobileLoginEmblemSize`.

Button labels use `typography.size` / `lineHeight` `buttonLabel` 16/24 (primary,
large and standard), `buttonLabelRegular` 15/22 and `buttonLabelCompact` 13/18.
Every button label is `typography.weight.semibold` (600) at every size and
variant; the weight is applied by the platform text styles (iOS
`DSTextStyle.buttonLabel*`, Android `DSButtonLabelTextStyle`).

## Hall of Fame wall (2026-11-03)

The `hall*` additions support the four tiers 1,000 / 500 / 300 / 100만원 이상.
They are additive; all existing `hallPlaque*` and `hallWall*FadeHeight` tokens
remain unchanged for the all-empty response fallback. No existing token is
exclusive to the retired 5,000만원 tier, so none is removed.

Colors are palette aliases with matching light/dark definitions. The hero is
`hallHeroBackground` (navy / near-black) with `hallHeroForeground` text. Cards
use `hallGold*`, `hallSilver*`, `hallBronze*`, or `hallNeutral*` accents and
surfaces; gold also has gradient endpoints. Neutral tiles have no border.
Names use `textPrimary`, all card labels and calm status lines use `hallLabel`.
`hallTabActive` styles the selected text/indicator, `hallTabInactive` the idle
text; `hallTabBackground` and `hallSectionHeaderBackground` are opaque sticky
surfaces. `hallWallBackground` provides the near-black dark wall base.
Metallic accents/borders are decorative; tier headings convey the tier in text.
Web keeps the generator's existing light-only semantic CSS policy; native
outputs include both schemes. Web dark-mode consumption is outside this task.

Use the existing `typography.size` / `lineHeight` structure. Native follow-up
tasks bind these pairs to **DSTextStyle**, using existing weight tokens:

| DSTextStyle / size and line-height token | Size / line height | Weight token |
| --- | --- | --- |
| `hallGoldName` | 22 / 30 | `bold` |
| `hallSilverName` | 17 / 24 | `semibold` |
| `hallBronzeName` | 16 / 24 | `semibold` |
| `hallNeutralName` | 15 / 22 | `medium` |
| `hallGoldLabel`, `hallSilverLabel`, `hallBronzeLabel`, `hallNeutralLabel` | 12 / 18 | `regular` |
| `hallHeroTitle` | 24 / 32 | `bold` |
| `hallHeroSubtitle` | 13 / 20 | `regular` |
| `hallTabLabel` | 12 / 18 | `semibold` |
| `hallSectionTitle` | 16 / 24 | `semibold` |

The generator emits DSFont / DesignTokens.Typography primitives, as for existing
styles; it does not define app-owned DSTextStyle or Android theme bindings.
This token-only task does not edit those helpers or the app token copies.

| Tier layout | Minimum width / height | Padding / radius | Grid gap |
| --- | --- | --- | --- |
| Gold, full width | 240 / 112 | 20 / 16 | 12 |
| Silver, two columns | 144 / 104 | 16 / 12 | 12 |
| Bronze, two compact columns | 136 / 88 | 12 / 12 | 12 |
| Neutral, three tiles | 96 / 72 | 8 / 8 | 8 |

Dimensions are pt/dp on native platforms. Use the corresponding
`sizing.hall*CardMinWidth/MinHeight` or `hallNeutralTileMinWidth/MinHeight`,
`layout.hall*CardPadding` / `hallNeutralTilePadding`, and `radius.hall*` tokens.
Widths fill their columns; scale the minimum column width with text and reduce
columns as available space requires (3 → 2 → 1, with gold always one).
Minimum heights must grow for wrapped names and labels; never truncate text.
The gold minimum width is an adaptive-layout preference, not a constraint that
may force overflow in a narrow viewport. All cards remain within available width.

`hallHeroMinHeight` is 240, `hallEmblemSize` 72 and `hallGoldCardEmblemSize` 24.
The sticky tab bar has minimum height 48, the section header 44, and interactive
targets use `hallTouchTarget` (48). At large text sizes, allow taller headers
and horizontally scrollable tabs. Use `screenPadMobile` for outer insets;
`hallHeroPadding`, `hallHeroContentGap`, `hallSectionHeaderPadding`,
`hallTabHorizontalPadding`, `hallSectionGap`, `hallGridGap`, `hallTileGap`,
`hallGoldEmblemGap` and `hallNameLabelGap` cover internal spacing. Card borders
use `hallCardBorderWidth` (1); neutral uses `hallNeutralBorderWidth` (0).

`motion.duration.hallShimmer` is 1400ms and `motion.easing.hallShimmer` is
`cubic-bezier(0.4,0,0.2,1)`. Web emits CSS values, Swift emits seconds and the
easing string, and Kotlin emits milliseconds and the easing string. Native
helpers must map the curve to their timing-curve APIs. Gold only, once per app
session on first opening; Reduce Motion skips it. These lifecycle rules are
app logic, not repetition defaults embedded in the token generator.

The `screen.donation` contract records the target behavior and text-style
bindings. Its existing app evidence paths are for the blank wall; new app
implementation and synthetic visual evidence are pending the native tasks.

## Generated Artifact Policy

Generated files under `design-system/platform/*` and copied platform token files must not be edited manually. Change `design-system/tokens/design-tokens.json`, then run:

```bash
npm run generate-design-system
```

Local and CI verification use:

```bash
npm run verify-design-system
```
