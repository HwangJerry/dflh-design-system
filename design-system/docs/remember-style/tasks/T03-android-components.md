# T03 — Android shared components + shell (dflh-saf-v2-kotlin only)

Scope: dflh-saf-v2-kotlin/design-system module and app/src/main/kotlin/com/dflh/app/core/ui + feature/navigation.
Do not restyle feature screens yet (T05/T06 will), but keep them compiling.

Implement SPEC §4 components in the design-system module (package com.dflh.designsystem), Compose, tokens only:
DSSegmentedTabs, DSFilterRow, DSPersonRow (trailing slot: DSBusinessCardThumb or DSAvatar), DSChip (accent/outline/
primary/tag), DSPostActionBar, DSPostCard (slots for body/expanded content so FeedScreen can inject its existing
inline detail + comments), DSConversationRow, DSSettingsRow, DSFab, DSPrimaryButton(52)/DSSecondaryButton(44) (reuse
DSButton variants if they fit; otherwise add sizes), DSMessageBubble restyle, DSSectionBlock (flat surface block with
8px gap helper), DSSubHeader (back + title + trailing).
Shell:
- MainTabHeader (core/ui/MainTabHeader.kt): 56px row, title 24/700, ≤2 icon actions 44×44, remove subtitle output
  (keep the parameter but ignore it, or delete callers' subtitles), no fake status bar.
- MainBottomNavigation: replace the floating pill nav with the flat bar in SPEC §4.11 (surface, 1px top divider,
  icon 24 + label 11, selected 700 tabSelectedText, unread pill on 쪽지, safe-area bottom padding). Keep the existing
  press/switch motion tokens where they still apply and keep MainNavigationRail for large widths.
- Add @Preview composables for every new component (light + dark).
Verify: ./gradlew :design-system:assembleDebug :app:assembleDebug testDebugUnitTest and, at the workspace root,
npm run verify-android-design-system. Commit in dflh-saf-v2-kotlin.
