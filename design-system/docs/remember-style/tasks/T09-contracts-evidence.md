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
