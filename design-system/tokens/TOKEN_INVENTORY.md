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

## Generated Artifact Policy

Generated files under `design-system/platform/*` and copied platform token files must not be edited manually. Change `design-system/tokens/design-tokens.json`, then run:

```bash
npm run generate-design-system
```

Local and CI verification use:

```bash
npm run verify-design-system
```
