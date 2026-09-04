# dflh-saf-v2 Cross-Platform Design System

This repository section defines the single source of truth for design tokens and component contracts used by Web (`dflh-saf-v2`), iOS (`dflh-saf-v2-swift`), and Android (`dflh-saf-v2-kotlin`).

## Structure

- `tokens/design-tokens.json`: canonical token source.
- `tokens/design-tokens.schema.json`: strict schema for the canonical token source.
- `tokens/TOKEN_INVENTORY.md`: category inventory, usage intent, schema rules, and generated-artifact policy.
- `docs/DESIGNER_ONBOARDING.md`: designer onboarding guide for token and contract handoff.
- `docs/WEB_ENGINEERING_GUIDE.md`: web adoption guide for `dflh-saf-v2/frontend`.
- `docs/IOS_ENGINEERING_GUIDE.md`: iOS adoption guide for `dflh-saf-v2-swift`.
- `docs/IOS_INSTAGRAM_STYLE_TAB_MENU_PLAN.md`: planned iOS icon-only bottom
  navigation variant for News Feed, Messages, and My Page.
- `docs/SOCIAL_MENU_ICON_SET.md`: approved social menu icon registry and
  platform mappings.
- `docs/ANDROID_ENGINEERING_GUIDE.md`: Android adoption guide for `dflh-saf-v2-kotlin/design-system`.
- `docs/TOKEN_LIFECYCLE.md`: token proposal, generation, and acceptance workflow.
- `docs/FIGMA_SYNC.md`: manual Figma → `design-tokens.json` variable sync (naming convention, what's excluded, pull procedure).
- `docs/CONTRACT_LIFECYCLE.md`: contract change, evidence, and generated-doc workflow.
- `docs/VALIDATION_WORKFLOW.md`: local and visual validation gates.
- `contracts/component-contracts.json`: reusable component and screen contracts with explicit platform states.
- `contracts/COMPONENT_CONTRACTS.md`: generated contract reference, violation rules, and evidence requirements.
- `platform/web/design-tokens.css`: generated CSS variables consumed by Tailwind/utility styles.
- `platform/ios/DesignTokens.swift`: generated Swift token map.
- `scripts/generate-platform-tokens.mjs`: one-shot generator from canonical JSON.
- `scripts/verify-design-system.mjs`: parity checks and contract coverage checks.
- `scripts/visual-check-web.mjs`: web baseline screenshot capture/diff (hash-level; page/image-level visual gate).
- `dflh-saf-v2-swift/Sources/App/DesignSystem/DesignTokens.swift`: copied generated iOS tokens used by app.

## Design-token coverage in v1.1.0

Current canonical tokens include:
- Color
- Typography (font family / weight / size)
- Spacing
- Radius
- Sizing
- Elevation
- Motion
- Layout metrics
- Iconography
- State tokens
- Opacity

`tokens/design-tokens.json` is the only editable source for platform tokens.
Generated artifacts under `platform/*` and copied app token files are rebuilt
from that source and should not be edited manually.

### Strict token schema

The schema is documented in `tokens/design-tokens.schema.json` and summarized in
`tokens/TOKEN_INVENTORY.md`. It requires:

- closed root sections with no undeclared token families,
- required color, typography, spacing, radius, sizing, elevation, iconography,
  layout, motion, and state token families,
- lower-camel token names, except numeric spacing scale keys,
- explicit units for pixel and millisecond values,
- bounded opacity and font-weight values,
- required interaction/data states.

## Workflow

1. Update canonical JSON.
2. Run validation.
3. Run generator and verify artifacts.
4. Refactor web, iOS, and Android screens to consume shared DS tokens.

Start with the role guide that matches your work:

- Designers: `docs/DESIGNER_ONBOARDING.md`
- Web engineers: `docs/WEB_ENGINEERING_GUIDE.md`
- iOS engineers: `docs/IOS_ENGINEERING_GUIDE.md`
- Android engineers: `docs/ANDROID_ENGINEERING_GUIDE.md`
- Token changes: `docs/TOKEN_LIFECYCLE.md`
- Contract changes: `docs/CONTRACT_LIFECYCLE.md`
- Pre-merge validation: `docs/VALIDATION_WORKFLOW.md`

### Commands

```bash
npm run validate-design-tokens
npm run generate-contract-docs
npm run verify-contract-docs
npm run verify-android-design-system
npm run generate-design-system
npm run verify-generated-design-system
npm run verify-design-system
npm run build-web-for-visual-check
DFLH_WEB_BASE_URL=http://127.0.0.1:4173 node design-system/scripts/visual-check-web.mjs
```

```bash
npm run verify-design-system:full
```

### CI integration

- The repository includes `.github/workflows/design-system-verify.yml`.
- GitHub Actions runs `npm run verify-design-system` and `npm run visual-check-ios` on push/PR to protect:
  - stale generated artifact detection via `npm run verify-generated-design-system`,
  - token generation parity,
  - required contract coverage,
  - implementation evidence token-usage rules.
- iOS parity is also validated against committed screenshot baselines from
  `design-system/verification/ios-snapshots/*`.

- For web visual parity in CI, the workflow starts the frontend preview server from
  `dflh-saf-v2/frontend` and runs `visual-check-web`, then exits on any baseline mismatch.
  Use the optional dispatch input `run_web_parity` to skip in local/manual runs when needed.

- For visual parity outside CI, run separately with:
  - `npm run build-web-for-visual-check`, then start `dflh-saf-v2/frontend` preview on `4173`.
  - `npm run visual-check-web` (requires web app available at `DFLH_WEB_BASE_URL`).
  - The visual-check build sets `VITE_VISUAL_CHECK_BYPASS_WIP=1`, so screenshots capture real app routes instead of the temporary WIP gate.
- iOS parity is validated from simulator captures and tracked in:
  `design-system/verification/reports/visual-check-ios.json` and
  `design-system/verification/ios-snapshots/decision-log.md`.

### Build-time + parity evidence guidance

- `verify-design-system.mjs` proves token contract completeness and generation wiring.
- `generate-contract-docs.mjs` rebuilds the generated component contract reference from `contracts/component-contracts.json`.
- `generate-contract-docs.mjs --check` fails when generated contract documentation is stale.
- `generate-platform-tokens.mjs --check` rebuilds expected web, iOS, Android, copied app token files, and manifest content in memory, then fails if committed artifacts differ.
- `verify-android-design-system.mjs` validates Android token-copy freshness, DS mapping files, screen token maps, reusable exports, and known Kotlin syntax hazards.
- `verify-design-system.mjs` writes `design-system/verification/reports/verify-design-system.json` and includes file, line, column, contract, platform, rule id, and matched value for hardcoded design-literal violations.
- `visual-check-web.mjs` captures deterministic screenshots for `뉴스피드`, `쪽지`, `마이페이지` (desktop + tablet + mobile).
- Add accepted deltas in `design-system/verification/reports/README.md` when unavoidable platform differences are intentionally retained.
