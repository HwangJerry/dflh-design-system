# Designer Onboarding Guide

This guide explains how product designers adopt the DFLH design system without
needing platform-specific engineering context.

## Source Of Truth

- Tokens: `design-system/tokens/design-tokens.json`
- Token inventory: `design-system/tokens/TOKEN_INVENTORY.md`
- Component and screen contracts: `design-system/contracts/component-contracts.json`
- Generated contract reference: `design-system/contracts/COMPONENT_CONTRACTS.md`
- Accepted visual differences: `design-system/verification/reports/accepted-deltas.json`
- Platform parity reports: `design-system/verification/reports/`

Treat tokens and contracts as the design API. Screens may differ by platform
only when the difference is required by form factor, safe area, or native
interaction conventions and is documented as an accepted delta.

## Design System Model

The system has two layers:

1. Design tokens define visual decisions: color, opacity, typography, spacing,
   radius, sizing, elevation, iconography, layout, motion, and state.
2. Component contracts define how primitives and target screens use those
   tokens across web, iOS, and Android.

Mandatory primitives:

- `app-shell`
- `card`
- `badge`
- `button`
- `navigation`

Mandatory screens:

- `screen.feed`
- `screen.messages`
- `screen.myPage`

## Designing New Work

1. Start from the contract matrix in
   `design-system/contracts/COMPONENT_CONTRACTS.md`.
2. Pick existing tokens before proposing a new token.
3. Specify every state required by the contract, including loading, empty,
   error, disabled, focus, press, and hover where applicable.
4. Document platform-specific behavior only when it is structural: safe areas,
   navigation chrome, input modality, or form factor.
5. Ask engineering to regenerate and verify the design system before accepting
   implementation screenshots.

## Token Naming Rules For Designers

- Use lower camel case names such as `surfaceHover` or `screenPadMobile`.
- Spacing is the only family that may use numeric scale keys.
- Do not add duplicate values as aliases unless the alias has a product meaning.
- Do not design with raw hex values after a color has been promoted to a token.
- Use `motion` for timing/easing and `state` for interaction/data states.

## Contract Checklist

Before handing off a design:

- The screen maps to an existing contract or includes a proposal for a new one.
- Every color, radius, spacing, type style, shadow, icon size, and motion value
  maps to an existing token or a proposed token change.
- All required states are represented.
- Any web/iOS/Android difference has a reason and a place to record evidence.
- The handoff names the relevant contract ids, token names, and target screens.

## Review Evidence

Design acceptance should use:

```bash
npm run verify-design-system
npm run visual-check-ios
npm run visual-check-web
npm run visual-compare-platforms
```

Use `npm run verify-design-system:full` when preview servers and baselines are
available.

