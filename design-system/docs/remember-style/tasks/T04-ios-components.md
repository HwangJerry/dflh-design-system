# T04 — iOS shared components + shell (dflh-saf-v2-swift only)

Scope: dflh-saf-v2-swift/Sources/App/DesignSystem and RootView.swift tab shell. Do not restyle feature screens yet
(T07/T08 will), but keep them compiling.

Implement SPEC §4 components in DSComponents.swift or new files in the DesignSystem folder (public SwiftUI views using
DSColor/DSSpace/DSRadius/DSFont only): DSSegmentedTabs, DSFilterRow, DSPersonRow (+ DSBusinessCardThumb), DSChip
(accent/outline/primary/tag), DSPostActionBar, DSPostCard (ViewBuilder slots for body/expanded content), 
DSConversationRow, DSSettingsRow, DSFab, DSPrimaryButton(52)/DSSecondaryButton(44) (extend DSButton sizes if
suitable), DSMessageBubble restyle, DSSectionBlock, DSSubHeader.
Shell:
- DSMainTabHeader: 56pt row, title 24/700, ≤2 trailing 44×44 icon actions, subtitle no longer rendered.
- Bottom navigation: replace DSIconTabBar's floating pill with the flat bar in SPEC §4.11 (surface, hairline top divider,
  icon 24 + label 11, selected bold tabSelectedText with filled icon for 기부/내정보, unread pill on 쪽지, safe-area
  aware). Keep DSRightNavigationRail for regular width.
- Add SwiftUI previews (light + dark) for each new component.
Verify: the xcodebuild command from AGENTS.md; at the workspace root npm run verify-ios-design-system (add exceptions
only with a reason). Commit in dflh-saf-v2-swift.
