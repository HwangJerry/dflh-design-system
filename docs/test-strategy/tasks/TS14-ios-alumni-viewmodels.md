# TS14 — iOS: move Alumni screen logic into testable view models

Repo: dflh-saf-v2-swift. Branch: `test/ts14-alumni-viewmodels`.

Same approach as TS13 (read Sources/App/Feature/Feed/FeedListViewModel.swift and the Message view models + their tests, and how
AppState provides them). Feature/Alumni is the lowest-covered feature (8.6%): AlumniSearchView.swift (562 lines, 27 @State) and
AlumniDetailView.swift (315 lines, 7 @State) hold the state and flows.

Do (behaviour and visuals must stay identical):
1. `AlumniSearchViewModel`: search text + debounce, preset tabs (전체 동문 / 같은 기수 / 같은 직종), filters (기수/학과/직종) and sort,
   pagination, total count, refresh, empty/error states, own-row handling, any cached filter options — whatever the view does today.
2. `AlumniDetailViewModel`: profile load, block/unblock, report entry, business card view state, "쪽지 보내기" entry state.
3. Depend on `AlumniServing` (TS10) or narrow closures; inject `now`/debounce scheduling so tests are deterministic (no real sleeps).
   Views keep layout, focus, sheets, navigation; keep accessibility identifiers, analytics, strings and design-system usage; keep
   visual-fixture mode working.
4. Unit tests with fakes: search/debounce, filter combinations reset pagination, pagination end, error → retry, block toggle rollback on
   failure, detail load failure. Report per-file coverage for the new view models.

Verify: `xcodegen generate`; unit tests all pass (baseline 380; report count); Debug build per AGENTS.md; `npm run verify-ios-design-system`;
`bash scripts/test-coverage.sh` (Feature/Alumni before → after); compare the alumni screens visually the same way TS13 did (same device,
parent vs current) and report the pixel result. Commit.
