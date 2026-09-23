# T09 — Contracts, docs and visual evidence (design-system + verification)

Prerequisite: T01–T08 committed. Scope: design-system/contracts, design-system/docs, design-system/verification,
and small compliance fixes in the mobile repos if verification finds any.
1. component-contracts.json: add primitives (segmentedTabs, filterRow, personRow, chip, postActionBar, postCard,
   conversationRow, settingsRow, fab, sectionBlock, subHeader, bottomTabBar) and update screen contracts feed/alumni/
   donation/messages/myPage with states and implementationEvidence for android + ios pointing at the new files.
   Run npm run generate-contract-docs.
2. README.md + docs/ANDROID_ENGINEERING_GUIDE.md + docs/IOS_ENGINEERING_GUIDE.md: short section "Remember-style
   components" linking SPEC.md and mockups. Mark docs/IOS_INSTAGRAM_STYLE_TAB_MENU_PLAN.md as superseded.
3. iOS visual baselines: npm run visual-check-ios:update-baseline (simulator required), then npm run visual-check-ios;
   append an entry to verification/ios-snapshots/decision-log.md describing the intentional redesign. Regenerate the
   visual baseline manifest. If the simulator is unavailable, say so explicitly and leave baselines untouched.
4. Run npm run verify-design-system at the root; fix anything failing.
Commit in the umbrella repo (and mobile repos if touched).
5. Pre-existing blocker found during T01: `npm run verify-ios-design-system` fails with
   [missing-contract-evidence] for dflh-saf-v2-swift/Sources/App/Feature/AppUpdate/ForceUpdateView.swift.
   Register it under the appropriate contract's implementationEvidence.ios (create a `screen.forceUpdate` contract if
   none fits) so the full gate passes.
6. Current `node design-system/scripts/verify-design-system.mjs` failures to resolve (fix the contract when the
   requirement is obsolete after the redesign, or the implementation when it is a genuine literal):
   - screen.messages ios raw-spacing-or-sizing-scalar: MessageConversationDetailView.swift `.padding(.vertical, DSSpace.inlineGap / 2)`
     → use a proper token (add one if needed) instead of an arithmetic expression.
   - screen.messages requires token usage `DSLayout.messageBubbleMaxWidthRatio` across iOS files → the new
     DSMessageBubble should apply the ratio; if it does so inside DSComponents.swift, adjust the contract file list.
   - screen.myPage requires `DSTextStyle.footnote` on iOS → ProfileView copyright footer should use it, or update the contract.
   Also re-check Android after the same pass: `npm run verify-android-design-system` currently passes.
