# TS13 — iOS: move Message and Feed screen logic out of SwiftUI views into testable view models

Repo: dflh-saf-v2-swift. Branch: `test/ts13-message-feed-viewmodels`.

Why: after TS10 AppState services are injectable, but Feature/Message (4.9%) and Feature/Feed (3.4%) coverage stays near zero because
their state and flows live inside views: FeedListView.swift (707 lines, 22 @State), MessageConversationDetailView.swift (669, 17 @State),
MessageListView.swift (266, 14 @State), MessageComposeSheetView.swift (507, 10 @State). These are the most-used features.

Do (behaviour and visuals must stay identical):
1. Introduce `@MainActor final class` ObservableObject view models, colocated in each feature folder:
   - FeedListViewModel: initial load, pagination/cursor, refresh, like toggle (optimistic update + rollback on failure), comment add,
     inline detail expand, banner slot, error/empty states — whatever FeedListView currently does.
   - MessageListViewModel: conversation list load/refresh, unread state, realtime updates, delete/leave if present.
   - MessageConversationDetailViewModel: thread load/pagination, send (pending → sent/failed + retry), mark read, realtime append/dedup,
     report/block entry points.
   - MessageComposeViewModel: recipient search/selection, validation, send.
   View models depend on narrow protocols (reuse TS10's `FeedServing`/`MessageServing`/`MessageRealtimeServing` or small closures), plus
   `now: () -> Date` where time matters. Views keep layout, focus, animation, sheet presentation and navigation; move decisions and async flows.
   Views obtain view models from AppState-provided services (e.g. `@StateObject` created with `state.feedService`-style accessors or a
   factory on AppState) — keep visual-fixture mode working (it may pass fixture-backed fakes).
2. Keep existing accessibility identifiers, test IDs, analytics calls and strings. Do not change design-system usage.
3. Unit tests for each view model with fakes: happy paths, pagination end, failure/rollback, retry, realtime dedup, empty/error states.
   Aim for the moved logic to be well covered (report per-file coverage).
4. Run the existing UI test target build (do not require it to pass if the simulator is flaky, but it must compile) and the visual check
   scripts if the repo has them for these screens.

Verify: `xcodegen generate`; unit tests all pass (baseline 322; report count); Debug build per AGENTS.md; `npm run verify-ios-design-system`;
`bash scripts/test-coverage.sh` and report Feature/Message and Feature/Feed totals before → after. Commit (one commit per feature is fine).
