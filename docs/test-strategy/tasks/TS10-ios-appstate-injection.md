# TS10 — iOS: make AppState's feature services injectable (testability refactor, no behaviour change)

Repo: dflh-saf-v2-swift. Branch: `test/ts10-appstate-injection`.

Context (verified): `AppState.init` (Sources/App/AppState.swift ~179-297) accepts protocols for session/auth/settings/social/analytics, but
creates concrete `BannerAdService`, `FeedService`, `DonationService`, `MessageService`, `MessageRealtimeService`, `ProfileService`,
`AlumniService`, `PushDeviceService` inline (~253-266), always uses `KeychainTokenStore()` (~194) and the default URLSession, and calls
`Date()` directly in several places. Feature state (messages/unread count, feed, alumni, profile) therefore cannot be unit tested with fakes.
iOS coverage is 17.8%; Feed 3%, Message 4.5%, Alumni 8.6% (lowest).

Do:
1. For each of those services add a protocol with exactly the methods AppState (and views via AppState) use; conform the existing class;
   store the protocol type in AppState. Add optional init parameters with the current concrete defaults, so every existing call site and
   production behaviour stay identical. Same for the token store (`any TokenStore`, existing protocol), an injectable `URLSession` for the
   API clients, and a `now: () -> Date` used where AppState reads the clock.
2. Do not move or rewrite the visual-fixture code paths (`if visualModeEnabled`) in this task; leave them working.
3. Add focused unit tests using simple fakes that cover previously untested AppState feature logic, at least:
   message conversation load + unread count/hasUnreadMessages updates + realtime event handling via the injected realtime service;
   feed load/pagination/like toggle path through AppState; alumni search call through AppState; one profile load. Assert state changes,
   not implementation details. Use the shared HTTPStub only where a real client is simpler than a fake.
4. Keep the diff mechanical and reviewable: no renames of public API used by views, no behaviour changes, no new dependencies.

Verify: `xcodegen generate` if files are added; unit tests all pass (baseline 304; report new count); Debug build per AGENTS.md;
`npm run verify-ios-design-system` from the workspace root; `bash scripts/test-coverage.sh` and report the new totals for AppState.swift,
Feature/Message, Feature/Feed, Feature/Alumni. Commit.
