# Validation Workflow

Use this workflow before merging design-system, web, iOS, or Android UI changes.

## Fast Local Gate

Run from the workspace root:

```bash
npm run verify-design-system
```

This validates:

- token schema and naming,
- generated platform token freshness,
- generated contract documentation freshness,
- Android design-system wiring,
- contract evidence coverage,
- hardcoded design literal violations in covered evidence files.

Sibling app repositories are optional. By default the scripts look for
`dflh-saf-v2-kotlin`, `dflh-saf-v2-swift`, and `dflh-saf-v2` under the
workspace/repository root. Set `DFLH_KOTLIN_REPO`, `DFLH_SWIFT_REPO`, or
`DFLH_WEB_REPO` to use another checkout location. Missing repositories are
reported as skipped and are not counted as verified.

Generated-token work can be scoped with `--only=self`, `--only=ios`,
`--only=android`, or a comma-separated combination. `self` covers the
in-repository platform artifacts and manifest; an omitted `--only` checks all
available targets.

## Platform Visual Gates

Web:

```bash
npm run build-web-for-visual-check
cd dflh-saf-v2/frontend
npm run preview -- --host 127.0.0.1 --port 4173
```

Then, from the workspace root:

```bash
npm run visual-check-web
```

iOS:

```bash
npm run visual-check-ios
```

Cross-platform parity:

```bash
npm run visual-compare-platforms
```

Full gate:

```bash
npm run verify-design-system:full
```

## Evidence Files

- Verification reports: `design-system/verification/reports/`
- iOS snapshot decisions:
  `design-system/verification/ios-snapshots/decision-log.md`
- Visual baseline manifest:
  `design-system/verification/visual-baseline-manifest.json`

## Failure Handling

- Token schema failure: fix `design-tokens.json` or schema docs before
  generating outputs.
- Generated artifact failure: run `npm run generate-design-system` and commit
  generated outputs.
- Contract doc failure: run `npm run generate-contract-docs` and commit the
  generated reference.
- Evidence failure: update implementation files to use DS tokens, or update the
  contract evidence path if the authoritative implementation moved.
- Visual mismatch: inspect the screenshot delta, decide whether it is a product
  regression or accepted platform difference, then update code or record an
  accepted delta.

## Merge Criteria

- Required local gates pass.
- Visual gates pass when touched UI is contract-covered or user-visible.
- Accepted deltas explain the product reason, scope, and owner.
- No generated artifact has uncommitted stale output.
