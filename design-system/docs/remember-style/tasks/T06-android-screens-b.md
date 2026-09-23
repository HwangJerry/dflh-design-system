# T06 — Android screens: 기부, 쪽지, 내정보 (dflh-saf-v2-kotlin only)

Prerequisite: T03, T05 committed. Scope: feature/donation/ui, feature/messages/ui, feature/profile/ui (+ tests, DTOs).
Implement SPEC §5.4, §5.5, §5.6 following Donation.dc.html / Messages.dc.html / MessageThread.dc.html / MyPage.dc.html.
- Donation: extend the summary DTO/UI model with monthAmount, balanceAmount?, balanceAsOf? (API per SPEC §5.4; keep
  parsing tolerant when fields are absent). Summary section, progress, two stat cards (이번 달 기부액 / 계좌 잔액 —
  hide balance card and caption when null), 내 나무 section reusing MyDonationTreeCard visuals, CTA. Remove any
  donorCount display.
- Messages: header, SegmentedTabs [전체, 안 읽음] (client-side filter), ConversationRow list, FAB 새 쪽지 → existing
  compose; thread screen sub header, date pills, bubbles, pill composer; keep realtime, blocked notice, report sheet.
- My page: profile section, contact rows with 공개/비공개 chips, settings rows (비밀번호 변경, 로그인 연동 with trailing
  method label, 알림 설정, 개인정보 설정, 로그아웃 destructive) wired to existing routes; copyright footer; restyle
  edit/password/account-settings sub screens with tokens but keep forms.
Verify: ./gradlew :app:assembleDebug testDebugUnitTest; npm run verify-android-design-system. Commit in dflh-saf-v2-kotlin.
