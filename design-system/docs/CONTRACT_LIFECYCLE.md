# Contract Lifecycle

Contracts define the shared component and screen API that each platform must
implement.

## Editable Source

Only edit:

- `design-system/contracts/component-contracts.json`

Generated reference docs are rebuilt from that file:

- `design-system/contracts/COMPONENT_CONTRACTS.md`

## Contract Scope

Contracts cover mandatory primitives and target screens:

- `app-shell`
- `card`
- `badge`
- `button`
- `navigation`
- `screen.feed`
- `screen.messages`
- `screen.myPage`

Each contract declares supported platforms, states, required token families,
explicit token usage, rules, and implementation evidence.

## Change Flow

1. Identify whether the change is a primitive contract, screen contract, state
   addition, platform addition, or evidence update.
2. Update `component-contracts.json`.
3. Regenerate the generated reference.
4. Update platform implementations and evidence files.
5. Run contract doc freshness and design-system verification.
6. Record accepted deltas only when platform differences are intentional and
   defensible.

## Commands

```bash
npm run generate-contract-docs
npm run verify-contract-docs
npm run verify-design-system
```

## Implementation Evidence Rules

- Mandatory screen contracts must list readable evidence files for supported
  platforms.
- Evidence files must contain required token families and explicit token usage.
- Raw color, spacing, sizing, radius, typography, and opacity literals are
  violations unless an approved exception is documented.
- Verifier output must identify the contract, platform, rule id, file, line,
  column, and matched value for hardcoded style violations.

## Acceptance Criteria

- The generated contract reference is fresh.
- Required states and token families are explicit.
- Web, iOS, and Android evidence files are present for supported contracts.
- `npm run verify-design-system` passes.

