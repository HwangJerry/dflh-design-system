# T08 — iOS screens: 기부, 쪽지, 내정보 (dflh-saf-v2-swift only)

Prerequisite: T04, T07 committed. Scope: Feature/Donation, Feature/Message, ProfileView.swift + Feature/Profile.
Implement SPEC §5.4, §5.5, §5.6 following Donation.dc.html / Messages.dc.html / MessageThread.dc.html / MyPage.dc.html.
- Donation: DonationSummaryDTO gains monthAmount, balanceAmount?, balanceAsOf? (tolerant decoding). Summary +
  progress + two stat cards (hide 계좌 잔액 card/caption when nil), 내 나무 section reusing MyDonationTreeCard,
  CTA; remove donorCount display.
- Messages: SegmentedTabs [전체, 안 읽음], ConversationRow list, FAB 새 쪽지 → existing compose sheet; thread sub
  header, date pill, bubbles, pill composer; keep realtime/blocked/report.
- My page: profile section, contact rows with chips, settings rows wired to existing destinations, destructive
  로그아웃, copyright; restyle sub screens with tokens but keep forms.
Verify: xcodebuild per AGENTS.md; npm run verify-ios-design-system. Commit in dflh-saf-v2-swift.
