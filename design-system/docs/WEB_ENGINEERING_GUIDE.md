# Web Engineering Guide

This guide is for contributors working in `dflh-saf-v2/frontend`.

## Required Sources

- Canonical tokens: `design-system/tokens/design-tokens.json`
- Generated web variables: `design-system/platform/web/design-tokens.css`
- Web import point: `dflh-saf-v2/frontend/src/index.css`
- Contracts: `design-system/contracts/component-contracts.json`
- Contract reference: `design-system/contracts/COMPONENT_CONTRACTS.md`

## Usage Rules

- Use token-backed Tailwind utilities such as `text-text-primary`,
  `text-text-secondary`, `bg-background`, `bg-surface`, `border-border`,
  `rounded-xl`, `shadow-card`, and tokenized spacing utilities.
- Use CSS variables from `design-tokens.css` only when a Tailwind class cannot
  express the value clearly.
- Keep News Feed, Messages, and My Page aligned with `screen.feed`,
  `screen.messages`, and `screen.myPage`.
- Do not add raw hex/rgb/hsl colors, one-off font stacks, arbitrary radius
  values, or hardcoded core surface spacing in contract-covered screens.
- Document intentional web-only differences in
  `design-system/verification/reports/accepted-deltas.json`.

## Adding Or Changing UI

1. Identify the primitive or screen contract.
2. Use existing shared components before adding a new UI pattern.
3. Map all color, spacing, typography, radius, elevation, icon, and motion
   choices to generated tokens.
4. Add or update implementation evidence in the contract if the covered files
   change.
5. Run verification from the workspace root.

```bash
npm run verify-design-system
```

For visual checks:

```bash
npm run build-web-for-visual-check
cd dflh-saf-v2/frontend
npm run preview -- --host 127.0.0.1 --port 4173
```

Then, from the workspace root:

```bash
npm run visual-check-web
```

## Review Checklist

- The component uses token-backed classes or generated CSS variables.
- The mandatory interaction/data states are represented.
- Screen-level containers use `app-shell`, `card`, `button`, `badge`, and
  `navigation` semantics where applicable.
- Generated token CSS was not edited by hand.
- `npm run verify-design-system` passes.

