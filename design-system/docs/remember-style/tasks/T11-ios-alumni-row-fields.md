# T11 — iOS alumni row: company line + 명함 thumbnail (dflh-saf-v2-swift only)

Scope: Feature/Alumni (AlumniModels.swift, AlumniRowView.swift, tests). Small task.

Backend `GET /api/alumni` items now always include `bizName` (string, "" when missing) and `bizCardUrl`
(nullable string). See dflh-saf-v2/docs/contracts/fixtures/alumni-search.json.

1. Add `bizName: String` and `bizCardUrl: String?` to AlumniDTO with tolerant decoding (default "" / nil when absent so
   older fixtures keep decoding).
2. AlumniRowView (DSPersonRow): third line = bizName (fall back to the current text when empty); trailing slot =
   DSBusinessCardThumb loading bizCardUrl (same async image approach used elsewhere in the app) when present, else the
   current DSAvatar. Match SPEC §4.4 and Alumni.dc.html.
3. Update/add unit tests (decoding with and without the new fields, row rendering choice).
4. Verify with the xcodebuild command in AGENTS.md; run npm run verify-ios-design-system at the workspace root (the
   pre-existing ForceUpdateView evidence failure is expected; report any other violation). Commit in dflh-saf-v2-swift.
