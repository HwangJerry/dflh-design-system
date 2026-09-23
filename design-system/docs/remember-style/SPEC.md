# Remember-style UI Spec (approved 2026-09-23)

Approved mockup canvas: https://claude.ai/artifact/6h9ooDipik69rJBCBV75bJ
Source artboards (HTML, pixel reference): `design-system/mockups/remember-style/*.dc.html`
(regenerate with `python3 design-system/mockups/remember-style/generate-mockups.py`).

Scope: Android (`dflh-saf-v2-kotlin`, Jetpack Compose) and iOS (`dflh-saf-v2-swift`, SwiftUI).
Web is out of scope for this pass; web tokens must keep generating and existing web checks must keep passing.

Functional scope is unchanged: the five tabs 소식 / 동문 / 기부 / 쪽지 / 내정보 keep their
features, routes, view models and API calls. Only presentation changes, plus one data addition
on 기부 (account balance).

## 1. Design principles (from 리멤버, mapped to DFLH brand)

| Remember pattern | DFLH implementation |
|---|---|
| Big left title + right icon actions, no subtitle | `DSMainTabHeader` → title 24/700, 44×44 icon buttons, subtitle removed |
| Black text underline tabs | Segmented text tabs, 2px underline in `brand.primary` (navy) |
| "전체 (N) ⌄" + right utilities row | 44px filter row on 동문 |
| Name 18 bold + 1촌 chip; 2 gray lines; card thumbnail right | 동문 row: name + 기수 chip (accent), 직함/학과, 회사, 96×60 명함 thumbnail (or 48 avatar) |
| Feed: avatar, name, time, body, "좋아요 N개 · 댓글 N개", 3-way action bar | Same structure; pinned notice shows "고정된 공지" row + 공지 chip |
| White surfaces separated by light gray gaps, no rounded cards | Sections are flat `surface` blocks with 8px `background` gaps |
| Orange camera FAB | Amber `brand.accent` FAB 56, used on 쪽지 (새 쪽지) |
| Remember orange | **Kept brand amber `#F59E0B`** (text form `#B45309` on light) |
| Remember black | **Kept brand navy `#1A1A2E`** |

Brand colors are unchanged. Everything that was Remember-orange becomes `brand.accent`;
everything Remember-black becomes `brand.primary`. Both live in a palette so they can be swapped later.

## 2. Palette and semantic tokens

Canonical source: `design-system/tokens/design-tokens.json`. Palette values are raw hexes;
semantic tokens reference palette entries via alias strings `{palette.<name>}` (light) and per
scheme in `colorSchemes.light|dark`. The generator resolves aliases so platform files still get hexes.

### palette (new root section)
| name | light | dark | note |
|---|---|---|---|
| brandPrimary | #1A1A2E | #F5F4F0 | navy; dark scheme uses light ink as "primary" |
| brandOnPrimary | #FDFBF4 | #14141C | |
| brandAccent | #F59E0B | #FBBF6A | amber |
| brandOnAccent | #1A1A2E | #14141C | |
| brandAccentText | #B45309 | #FBBF6A | 4.5:1 on light surfaces |
| brandAccentSubtle | #FFFBEB | #2A2419 | chip bg |
| brandAccentBorder | #FDE7B6 | #3D3320 | |
| ink1 | #1A1A2E | #F5F4F0 | text primary |
| ink2 | #555555 | #B8B8C2 | text secondary |
| ink3 | #888888 | #8A8A96 | text tertiary |
| ink4 | #AAAAAA | #6E6E7A | placeholder / disabled chevrons |
| paper | #FFFFFF | #1E1E2A | surface (list/cards) |
| paperAlt | #FAFAF8 | #262636 | surface2 (inputs, thumbnails) |
| canvas | #F5F4F0 | #14141C | page background between sections |
| line | #E8E5DF | #33333F | border |
| lineSoft | #F0EDE8 | #2A2C35 | divider |
| danger | #DC2626 | #F87171 | |
| positive | #047857 | #34D399 | |

### semantic colors (add to `colors` + both `colorSchemes`, alias to palette)
headerTitle, headerIcon → brandPrimary/ink1 · tabIndicator, tabSelectedText → brandPrimary/ink1 ·
tabIdleText → ink3 · rowSurface → paper · rowDivider → lineSoft · sectionGap → canvas ·
chipAccentBg → brandAccentSubtle · chipAccentText → brandAccentText · chipOutlineBorder → line ·
fabBackground → brandAccent · fabForeground → brandOnAccent · unreadBadge → brandAccent ·
unreadBadgeText → brandOnAccent · likeActive → brandAccentText · progressFill → brandAccent ·
progressTrack → lineSoft · primaryButtonBg → brandPrimary · primaryButtonText → brandOnPrimary ·
secondaryButtonBorder → line · bubbleMine → brandPrimary · bubbleMineText → brandOnPrimary ·
bubbleTheirs → paper · bubbleTheirsBorder → line · destructiveText → danger.

Existing tokens (`primary`, `warm`, `surface`, …) stay for backward compatibility and are re-pointed
to the same palette entries where their value is identical.

## 3. Layout metrics (add to `sizing` / `layout` / `radius` where missing)

| token | value |
|---|---|
| sizing.tabHeaderHeight | 56px |
| sizing.segmentedTabHeight | 48px |
| sizing.segmentedTabIndicator | 2px |
| sizing.filterRowHeight | 44px |
| sizing.listRowVerticalPad | 16px (동문) / 14px (쪽지) |
| sizing.alumniCardThumbWidth / Height | 96px / 60px |
| sizing.avatarSm / Md / Lg / Xl | 32 / 40 / 48 / 64px (80 for detail hero) |
| sizing.fab | 56px |
| sizing.chipHeight | 20px (tag chip 24px) |
| sizing.actionBarHeight | 48px |
| sizing.primaryButtonHeight | 52px, secondary 44px |
| sizing.bottomTabHeight | 56px (+ safe area) |
| layout.screenPad.mobile | 20px (was 16) |
| layout.sectionGap | 8px |
| radius.button | 8px · radius.chip 4px · radius.thumb 4px · radius.section 0 |
| typography.size.tabTitle 24 · listName 18 · body 16 (line 26) · meta 13/14 · caption 11/12 |

## 4. Shared components (both platforms; names are the Android/iOS pair)

1. **MainTabHeader / DSMainTabHeader** – 48px top spacer is the system safe area (do not draw a fake
   status bar); 56px row; title 24/700 letter-spacing -0.4; up to 2 icon actions 44×44 right; no subtitle.
2. **SegmentedTabs / DSSegmentedTabs** – equal-width text tabs, 16px, selected 700 + 2px indicator,
   idle 500 `tabIdleText`; 1px `rowDivider` under the row; horizontal inset 12.
3. **FilterRow / DSFilterRow** – left "전체 (N) ⌄" 14/600, right utilities (icon 16 + label 14), height 44.
4. **PersonRow / DSPersonRow** – name 18/700 + chip, two 14px secondary lines (ellipsized),
   trailing slot (명함 thumbnail 96×60 with 1px `line` border r4 on `paperAlt`, or avatar 48).
   Padding 16×20, `rowDivider` bottom.
5. **Chip / DSChip** – variants: accent (기수 "20기"), outline (본인, 공개/비공개), primary (공지),
   tag (#태그, 24px pill).
6. **ActionBar / DSPostActionBar** – 3 equal buttons 48px: 좋아요 / 댓글 / 공유, icon 20 + 14/600,
   like active uses `likeActive` filled heart.
7. **PostCard / DSPostCard** – flat `rowSurface` article: optional "고정된 공지" row (pin 14 + 12/700 accentText),
   header (avatar 40, name 15/700, time 12 ink3, role 13 ink2, kebab), body 16/26 with optional
   category chip and inline "더보기" link, optional link preview (96×80 thumb + title 14/700 + 12 ink3),
   engagement summary 13 ink2 "좋아요 N개 · 댓글 N개 · 조회 N", divider, ActionBar.
8. **ConversationRow / DSConversationRow** – avatar 48, name 16 (700 when unread), time 12 right,
   preview 14 (ink1 unread / ink3 read), unread pill 20px `unreadBadge`.
9. **SettingsRow / DSSettingsRow** – 54px, leading icon 20, label 15/500, optional trailing caption 13 ink3,
   chevron 18 ink4; destructive variant red text and no chevron.
10. **FAB / DSFab** – 56 circle `fabBackground`, icon 26 `fabForeground`, shadow `0 6 16 rgba(245,158,11,.35)`,
    anchored right 20 / above tab bar 24.
11. **BottomTabBar** – flat `rowSurface`, 1px `rowDivider` top, 5 items icon 24 + label 11
    (selected 700 `tabSelectedText`, filled icon for 기부/내정보; idle `tabIdleText`), unread count pill on 쪽지.
    The existing floating pill nav is replaced by this flat bar on both platforms.
12. **PrimaryButton 52 / SecondaryButton 44** – r8, 16/700 on primary, 15/600 outlined secondary.
13. **MessageBubble** – mine: `bubbleMine`, r16 with 4px tail corner bottom-right, 15/22;
    theirs: `bubbleTheirs` + 1px border, tail bottom-left; time 11 ink3 beside bubble.

## 5. Screens

### 5.1 소식 (Main.dc.html / FeedDark.dc.html)
Header "소식" [search, bell] → SegmentedTabs [전체, 공지, 장학, 동문] (filter by category; "전체"
default; tabs map to existing feed category values, add only if the API already exposes category) →
list of PostCard separated by 8px `sectionGap`. Pinned notices render first with the 고정 row.
Inline expansion / comments / like behaviour is unchanged; restyle the expanded body and comment
composer with the same tokens. Banner ad section keeps its slot after the first post but as a flat section.

### 5.2 동문 (Alumni.dc.html / AlumniDark.dc.html)
Header "동문" [search, bell] (search icon opens the existing search field inline below the header, 44px
`paperAlt` field r22) → SegmentedTabs [전체 동문, 같은 기수, 같은 직종] (preset filters on the
existing cohort / jobCategory filters) → FilterRow "전체 (N)" + [기수순 sort, 필터] (필터 opens the
existing 기수/학과/직종 menus in a bottom sheet) → PersonRow list. Row tap opens AlumniDetail.
Own row shows 본인 outline chip instead of the 기수 chip.

### 5.3 동문 프로필 상세 (AlumniDetail.dc.html)
Sub header (back, "동문 프로필", kebab) → hero section: avatar 80, name 22/700 + 기수 chip,
"직함 | 부서", 회사; buttons [쪽지 보내기 primary 44][명함 보기 secondary 44] →
sections 학교 / 직장 / 연락처 / 전문분야·태그 as flat blocks with 44px key-value rows
(key 64px ink3 14, value 15 ink1, 비공개 outline badge). Block/신고 actions stay under the kebab.

### 5.4 기부 (Donation.dc.html)  — data composition is FINAL
Header "기부" [bell] → Summary section: caption "장학회 전체 누적 기부" 13/600 ink3; amount 34/700
+ "원" 18/600; progress bar 8px r4 (`progressFill` on `progressTrack`) with "목표 N원" left and
"N%" right (accentText 700); two stat cards (`paperAlt`, 1px line, r8, 12 caption + 18/700):
**이번 달 기부액** and **계좌 잔액**; caption 12 ink4 "계좌 잔액 기준일 YYYY.MM.DD · 장학회 관리자 입력".
**Do not show 참여 동문 (donorCount).** → 내 나무 section: tree illustration 104 + "내 나무" caption +
stage chip + headline 20/700 + 2 lines 14 ink2 → CTA section: PrimaryButton "해피나눔에서 기부하기"
+ 2-line 12 ink3 note. Balance card is hidden when the API returns no balance.

API: `GET /api/donation/summary` gains `monthAmount` (int64, current calendar month total, same
source as displayAmount), `balanceAmount` (int64, nullable) and `balanceAsOf` (YYYY-MM-DD, nullable).
Balance is entered manually in the admin SPA Donation config section and stored with the donation config.

### 5.5 쪽지 (Messages.dc.html / MessageThread.dc.html)
Header "쪽지" [search, bell] → SegmentedTabs [전체, 안 읽음] → ConversationRow list on `rowSurface`
→ FAB 새 쪽지 (opens existing compose). Thread: sub header with back, avatar 32, name 16/700,
"기수 학과 · 회사" 12 ink3, kebab → date pill centered → bubbles → composer: 44px pill input on
`paperAlt` + 44 round send button `bubbleMine`. Unread count remains on the tab bar.

### 5.6 내정보 (MyPage.dc.html)
Header "내정보" [bell, gear] → Profile section: avatar 64, name 22/700 + 기수 chip, "직함 | 회사",
학과, pen button 40 outlined; bio 15/22; tag chips; [내 명함][동문에게 보이는 화면] secondary 44 →
Contact section: phone / mail rows 48px with 공개/비공개 outline chip → Settings section:
비밀번호 변경, 로그인 연동 (trailing "카카오"), 알림 설정, 개인정보 설정, 로그아웃 (destructive) →
copyright 11 ink4 centered. Existing sub-screens (edit, password, account settings) restyle with the
same tokens but keep their forms.

## 6. Verification requirements
- `npm run verify-design-system` passes at repo root after every task (token validation, generated
  artifacts fresh, contract docs, Android/iOS compliance).
- Android: `./gradlew :app:assembleDebug` and `./gradlew testDebugUnitTest` pass.
- iOS: the `xcodebuild` command in `dflh-saf-v2-swift/AGENTS.md` passes; no new design literals
  outside the DesignSystem folder (or an entry in `ios-design-system-exceptions.json` with reason).
- Backend: `go test ./... && go vet ./...`; admin: `npm run build && npm run lint`.
- Contracts: update `component-contracts.json` (+ regenerate docs) for every new primitive and for
  screen changes, with implementationEvidence for android and ios.
- Visual evidence: refresh iOS baselines via `npm run visual-check-ios:update-baseline` and log the
  intentional change in `design-system/verification/ios-snapshots/decision-log.md`.
