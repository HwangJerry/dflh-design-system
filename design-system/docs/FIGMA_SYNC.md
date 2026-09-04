# Figma Token Sync

Figma is where designers edit scalar design values. `design-system/tokens/design-tokens.json`
remains the engineering source of truth. Sync is **one-way, Figma → JSON, run manually** in a
Claude Code session with the Figma MCP tools connected — there is no CI automation for this step.

## The Figma file

- File: **"DFLH Design Tokens"** (`fileKey: HluYAR3uQc9ICIEBfWhCz6`)
- Team: "J H's team" (`team::1090621565622341091`)
- Three variable collections, each with a single `Value` mode (Starter-tier Figma plans are
  limited to 1 mode per collection, so appearance-specific overrides remain engineering-managed):
  - **Color** — all `colors.*` entries as COLOR variables
  - **Scale** — all numeric families as FLOAT variables (spacing, radius, opacity, typography
    size/weight, iconography size/lineWeight, motion duration, sizing, layout)
  - **String** — `typography.fontSans` / `typography.fontSerif` as STRING variables

It was seeded once (bootstrap) from the JSON values that existed at the time. From here on,
designers edit values directly in Figma; engineers pull changes back with the procedure below.

## Naming convention

A Figma variable's name is the token's JSON path joined with `/` — Figma's native grouping
separator. The import script splits on `/` to rebuild the nested `design-tokens.json` structure.

| Figma variable name | JSON path |
|---|---|
| `color/primary` | `colors.primary` |
| `spacing/4` | `spacing["4"]` |
| `radius/md` | `radius.md` |
| `typography/size/h1` | `typography.size.h1` |
| `typography/weight/bold` | `typography.weight.bold` |
| `sizing/headerHeight/web` | `sizing.headerHeight.web` |
| `layout/screenPad/mobile` | `layout.screenPad.mobile` |
| `typography/fontSans` | `typography.fontSans` |

**Renaming a variable in Figma breaks the mapping.** Don't rename — if a token needs a new name,
coordinate the rename in `design-tokens.json` first (see `TOKEN_LIFECYCLE.md`), then rename the
matching Figma variable to match.

## What is NOT synced from Figma

These stay hand-edited only in `design-tokens.json`, because Figma Variables have no type that
represents them without lossy conversion:

- `elevation.*` — raw CSS `box-shadow` strings (Figma effect *styles* are a different, non-scalar
  Figma concept and are out of scope for this sync)
- `motion.easing.*` — cubic-bezier / keyword strings
- `version`, `sourceOfTruth`, `platformMapping`, `state.states` — structural/metadata fields
- `colorSchemes.*` — appearance-specific semantic overrides; the single-mode Figma collection
  continues to sync only the base/light `colors.*` values

If these ever need Figma-side authoring, that's a separate, larger change (see the note at the
end of this doc about Effect Styles), not part of this token-variable sync.

## Pull procedure (run manually, every time)

1. In this Claude Code session (or a future one with the Figma MCP connected), run a read-only
   `use_figma` script against `fileKey HluYAR3uQc9ICIEBfWhCz6` that returns every local variable's
   name, resolved type, and value (see the script below). Save the returned array as
   `design-system/tokens/.figma-variables-export.json` (git-ignored, transient).

   ```js
   const collections = await figma.variables.getLocalVariableCollectionsAsync();
   const allVars = await figma.variables.getLocalVariablesAsync();
   const modeIdByCollection = new Map(collections.map(c => [c.id, c.modes[0].modeId]));
   function toHex(n) {
     return Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');
   }
   const result = [];
   for (const v of allVars) {
     const modeId = modeIdByCollection.get(v.variableCollectionId);
     if (!modeId) continue;
     const raw = v.valuesByMode[modeId];
     const value = v.resolvedType === 'COLOR'
       ? `#${toHex(raw.r)}${toHex(raw.g)}${toHex(raw.b)}`.toUpperCase()
       : raw;
     result.push({ name: v.name, type: v.resolvedType, value });
   }
   return result;
   ```

   Note: the Figma MCP's `get_variable_defs` tool is **not** used here — it only returns variables
   actually bound to a specific node's rendered properties, not the full set of local variables in
   the file. Since these tokens aren't bound to any canvas node (the file only holds variable
   definitions), a `use_figma` read script is the correct way to enumerate them.

2. `npm run import-figma-tokens` — reads `.figma-variables-export.json`, writes the mapped values
   into `design-tokens.json`, bumps the patch version, preserves everything not covered by the
   sync (see above).
3. `npm run validate-design-tokens`
4. `npm run generate-design-system` — regenerates Swift/Kotlin/Web token files.
5. `npm run verify-design-system` (or `verify-design-system:full` for visual parity too).
6. Review the diff, then commit.

## Future extension: components

This sync covers scalar tokens only. Mapping actual Figma *components* (buttons, cards, etc.) to
`DSComponents.swift` / `DSComponents.kt` via Figma Code Connect is a separate, larger effort —
see `docs/TOKEN_LIFECYCLE.md` and `contracts/COMPONENT_CONTRACTS.md` for the current
code-only component contract system this would extend.
