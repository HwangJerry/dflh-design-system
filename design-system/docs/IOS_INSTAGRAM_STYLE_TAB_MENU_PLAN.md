# iOS Instagram-Style Tab Menu Plan

## Goal

Improve the iOS authenticated bottom navigation using an Instagram-inspired
icon menu pattern while keeping the implementation governed by the shared
design system.

Initial menu mapping:

- News Feed: home icon
- Messages: paper plane icon
- My Page: heart icon

## Design System Registration

Treat this as a `navigation` primitive variant, not as screen-specific styling.
The implementation should extend the existing navigation contract semantics
instead of adding isolated visual code in `RootView`.

Planned contract shape:

- Primitive: `navigation`
- Variant: `socialIconTabBar`
- States: `default`, `active`, `inactive`, `badge`
- Platforms: `ios` first, then web/android parity only if product scope requires
  matching navigation on those platforms.

Required token usage:

- Container: `DSColor.surface`, `DSColor.background`, `DSSizing.safeBottomNavHeight`
- Tap target: `DSSizing.touchTarget`
- Icon sizing and stroke: `DSIcon`, `DSIconography`
- Spacing: `DSSpace`, `DSLayout`
- Active/inactive color: `DSColor.textPrimary`, `DSColor.textSecondary`
- Badge: existing `badge` primitive tokens
- Icon registry: `DSMenuIcon`, registered in `docs/SOCIAL_MENU_ICON_SET.md`
- Press/selection motion: `DSAnimation`, `DSOpacity`

Generated contract documentation must still be produced from
`contracts/component-contracts.json`; do not edit
`contracts/COMPONENT_CONTRACTS.md` by hand.

## Product Behavior

The authenticated root navigation should expose three primary destinations:

- `AppTab.feed`: label `뉴스피드`, visual icon `DSMenuIcon.home`
- `AppTab.messages`: label `쪽지`, visual icon `DSMenuIcon.paperPlane`
- `AppTab.profile`: label `마이페이지`, visual icon `heart`.

The menu may only use the approved registry in `docs/SOCIAL_MENU_ICON_SET.md`.
Do not introduce profile/person icons into this menu without updating that
registry and the `navigation` contract first.

Accessibility labels remain text-based even when the visible navigation is
icon-only:

- `뉴스피드`
- `쪽지`
- `마이페이지`

The selected tab must be announced through accessibility selected state.

## Implementation Plan

1. Contract update
   - Add the `socialIconTabBar` variant to the `navigation` primitive in
     `contracts/component-contracts.json`.
   - Register allowed menu icons in `docs/SOCIAL_MENU_ICON_SET.md` and expose
     them through `DSMenuIcon` in the iOS design-system implementation.
   - If new token names are required, add them to `tokens/design-tokens.json`
     first and regenerate platform tokens.
   - Run `npm run generate-contract-docs` and keep generated contract docs in
     sync.

2. iOS design-system component
   - Add `DSMenuIcon` under
     `dflh-saf-v2-swift/Sources/App/DesignSystem/DSComponents.swift` or a
     dedicated design-system component file if the file becomes too broad.
   - Keep menu icon usage routed through the registry instead of raw SF Symbol
     strings in app shell code.

3. Root navigation integration
   - Use native SwiftUI `TabView` with icon-only `tabItem` images in
     `Sources/App/RootView.swift`.
   - Use `AppState.selectedTab` as the single selected-tab source of truth.
   - Keep screen ownership unchanged:
     - Feed screen remains `FeedListView`
     - Messages screen remains `MessageListView`
     - My Page screen remains `ProfileView`

4. Message badge support
   - Keep this optional for the first pass unless unread count state already
     exists.
   - If implemented, render unread state through the existing `badge` primitive
     tokens.

5. Verification
   - Run `npm run verify-design-system` from the workspace root.
   - Run `npm run visual-check-ios`.
   - Update iOS visual baselines only after confirming the new tab menu is an
     intentional product change.
   - Record the accepted visual delta in
     `verification/ios-snapshots/decision-log.md`.

## Acceptance Criteria

- The authenticated iOS bottom menu uses icon-only navigation matching the
  Instagram-style reference direction.
- News Feed uses a home icon.
- Messages uses a paper plane icon.
- My Page uses an icon from `DSMenuIcon`.
- App shell menu code does not use raw SF Symbol names directly.
- No new hardcoded visual literals are introduced in covered iOS evidence files.
- The navigation behavior continues to use `AppState.selectedTab`.
- Design-system verification and iOS visual checks pass, or intentional visual
  deltas are documented.
