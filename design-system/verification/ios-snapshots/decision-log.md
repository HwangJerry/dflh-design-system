# iOS Visual Parity Decision Log

## 2026-06-12

- Scope: News Feed (`/`), Messages list/detail, MyPage
- Status: evidence collection pending in this run.
- Reason: automated iOS capture workflow was not available from this environment.
- Decision: document required manual capture procedure below and attach screenshots before CI gate can enforce parity across iOS/web.

## Evidence manifest (pending)

- Target manifest: `design-system/verification/ios-snapshots/visual-evidence-manifest.json`
- Current status: pending captures for all mandatory screens.

## Baseline and capture procedure (manual)

1. Launch `dflh-saf-v2-swift` on iPhone 15 simulator.
2. Navigate each mandatory screen:
   - News Feed (home)
   - Messages list and one conversation detail
   - MyPage
3. Capture full-screen screenshots with filenames:
   - `iOS-Feed-mobile.png`
   - `iOS-MessagesList-mobile.png`
   - `iOS-MessagesThread-mobile.png`
   - `iOS-MyPage-mobile.png`
4. For deterministic fixtures, launch with:
   - `DFLH_VISUAL_TEST=1`
   - `DFLH_VISUAL_TEST_SCREEN=<feed|messages|messages-thread|mypage>`
   - Optional: `DFLH_VISUAL_TEST_CONVERSATION=2101`
5. Save files to `design-system/verification/ios-snapshots/`.
6. Record any intentional difference entries in `design-system/verification/reports/accepted-deltas.json` as `route`-level notes with reason and approver metadata.

## Recommended automation command

```bash
# capture one screenshot while app is foregrounded:
xcrun simctl io booted screenshot design-system/verification/ios-snapshots/iOS-Feed-mobile.png
```


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-12T10:02:30.204Z
- pending items:
- iOS-Feed-mobile.png: missing-both
- iOS-MessagesList-mobile.png: missing-both
- iOS-MessagesThread-mobile.png: missing-both
- iOS-MyPage-mobile.png: missing-both
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-12T10:19:23.089Z
- pending items:
- iOS-Feed-mobile.png: missing-both
- iOS-MessagesList-mobile.png: missing-both
- iOS-MessagesThread-mobile.png: missing-both
- iOS-MyPage-mobile.png: missing-both
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-12T10:20:03.975Z
- pending items:
- iOS-Feed-mobile.png: missing-both
- iOS-MessagesList-mobile.png: missing-both
- iOS-MessagesThread-mobile.png: missing-both
- iOS-MyPage-mobile.png: missing-both
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-12T10:22:58.676Z
- pending items:
- iOS-Feed-mobile.png: missing-baseline
- iOS-MessagesList-mobile.png: missing-baseline
- iOS-MessagesThread-mobile.png: missing-baseline
- iOS-MyPage-mobile.png: missing-baseline
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.

## 2026-06-12 (iOS visual parity evidence)

- Scope: News Feed, Messages list, Messages detail, MyPage (mobile only)
- Status: passed (capture + baseline matched)
- Command: `DFLH_IOS_VISUAL_MODE=guard node design-system/scripts/visual-check-ios.mjs`
- Evidence:
  - manifest: `design-system/verification/ios-snapshots/visual-evidence-manifest.json`
  - report: `design-system/verification/reports/visual-check-ios.json`
  - decision: no additional intentional deltas required
- Notes:
  - Previous pending entries are superseded by the completed matching run.

## 2026-06-15 (automated iOS visual regression coverage)

- Scope: Feed, Messages list, Messages thread, MyPage migrated SwiftUI screens.
- Baselines: versioned under `design-system/verification/ios-snapshots/baseline/`.
- Captures: reproducible via `npm run visual-check-ios:capture`, which builds the Swift app, launches simulator screens with `DFLH_VISUAL_TEST=1`, and writes current screenshots under `design-system/verification/ios-snapshots/captures/`.
- Diff tests: `npm run visual-check-ios` performs exact PNG comparison and writes changed-screen diff PNGs under `design-system/verification/ios-snapshots/diffs/`.
- Intentional deviations: none for iOS baseline-vs-capture as of this run. Existing web/iOS platform deviations remain documented in `design-system/verification/reports/accepted-deltas.json`.
- Baseline updates: use `npm run visual-check-ios:update-baseline` only after approving and documenting the intentional visual change.


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-15T01:47:55.164Z
- pending items:
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-15T01:49:13.354Z
- pending items:
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-15T01:50:08.888Z
- pending items:
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-06-15T01:51:34.519Z
- pending items:
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: capture
- generatedAt: 2026-06-15T01:52:11.888Z
- pending items:
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-01T16:06:03.075Z
- pending items:
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-02T00:21:36.794Z
- pending items:
- action: capture missing files into design-system/verification/ios-snapshots/captures and re-run.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-07T13:31:14.129Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-07T13:33:52.468Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-07T13:35:22.500Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-07T13:37:42.982Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-07T13:39:49.463Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.

## 2026-09-07 — reviewed redesign baselines

- The old baselines predated the merged iOS redesign (`c90fe23`, merge `c639b02`): three native tabs/card list changed to five custom tabs and redesigned feed, conversations and profile.
- Fixed the capture harness: fixed light appearance, Large text size, Korean locale, Seoul timezone and 9:41 status bar on Codex iPhone 15 / iOS 26.0 (1179 x 2556).
- Capturing messages-thread exposed a missing visual fixture for `loadBlockState`: the real authenticated request invalidated the fixture session and captured login instead of the thread. It now returns an unblocked fixture without network access.
- Real rendering defects corrected before baseline promotion: hide the system tab bar on each child; lay out the custom tab bar below the TabView so it cannot cover the message composer.
- Reviewed Feed, MessagesList, MessagesThread and MyPage: one custom tab bar, correct target content, visible composer, no login/error state. Promoted these reviewed captures, then recaptured for an independent comparison.
- Inspection by Codex under the user's approved correction plan. No blanket accepted-delta exception was used. A fresh repeat matched three screens exactly; the thread differed at 69 back-chevron edge pixels, each RGB channel by at most 1 (bounding box 94,217–125,271). The per-pixel total channel threshold is therefore 3; the allowed changed-pixel ratio stays 0. This only ignores observed quantization noise.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-07T13:41:36.649Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-07T13:42:52.814Z
- pending items:
- iOS-MessagesThread-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.

- A pending notification authorization alert was exposed after running XCTest. Visual mode now skips push registration/authorization, and a simulator restart cleared the pre-existing system alert before the independent recapture.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-08T02:00:42.851Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-08T02:03:11.468Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-08T02:08:25.446Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-08T05:45:49.585Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## 2026-09-08 — Figma V4 / V5 native implementation review

Reviewed all four fresh iPhone 15 captures against the approved Figma V4 references. Accepted the intentional redesign: Noto Sans KR, warm surface palette, floating five-tab bar with a thin selection indicator, pinned feed hero, unread rows, compact profile actions, and native chat composer. Captures contain fixture data, native safe areas and OS chrome; they are regression baselines, not evidence of exact raster equality with Figma. Promote these reviewed captures. V5 reverse-stacked forms and all 16 routes per platform are recorded separately in output/figma-design-review-2026-09-08/implementation/. Existing web design captures are unrelated and were not changed by this review.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-10T02:42:48.266Z
- pending items:
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-10T02:43:48.827Z
- pending items:
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-10T04:31:28.952Z
- pending items:
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-10T05:43:38.402Z
- pending items:
- iOS-Feed-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-10T06:09:34.315Z
- pending items:
- iOS-Feed-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


2026-09-10 Feed V8 fidelity: reviewed new feed capture a8f61e9776de9a8b2e87fcc0ce4e2482c4e8cb58e5d9114227f46df5cf672732. Reduced vertical action whitespace, stronger action counts, quieter views. Accept exact hash against existing baseline; no baseline update. Delayed-image and inline-like-failure UI tests passed.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-10T06:22:19.082Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.

2026-09-10 Navigation alignment: top-align native iOS stack; shared icon/label top
14/38, optical vector correction in both platforms. Reviewed Feed, MessagesList,
and MyPage; accepted exact hashes. MessagesThread unchanged from its existing date
delta. Press-motion design is separate and remains unimplemented.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-10T07:11:47.230Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-23T03:16:16.490Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MessagesThread-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.

## 2026-09-23 — T09 Remember-style native redesign

Reviewed fresh captures of Feed (expanded article/comments), MessagesList,
MessagesThread and MyPage against the approved
[Remember-style spec](../../docs/remember-style/SPEC.md) and
[HTML pixel references](../../mockups/remember-style/). Accept the intentional
T01–T08 redesign: large left titles, text tabs with navy underlines, flat white
rows/sections and canvas gaps, amber chips/unread badges and compose FAB,
three-way post actions, profile/contact/settings rows, and the labeled flat
five-tab bar. The thread uses asymmetric navy/white bubbles with beside-bubble
timestamps, a date pill and the existing composer. T09 additionally enforces
`DSLayout.messageBubbleMaxWidthRatio` inside the shared bubble layout and names
the existing 3px caption inset; the 11px profile copyright remains unchanged.

Capture environment: `Codex iPhone 15` (`92D331D5-D3EE-410D-B7FC-CB99D29ADEA4`),
iOS 26.0, 1179 × 2556 pixels, light appearance, Large text, Korean locale,
Asia/Seoul timezone and 9:41 system status bar. The visual fixture's content,
expanded feed state and native font/system chrome differ from the static HTML;
these are regression baselines, not a claim of identical mockup raster output.
Only the four existing capture targets are covered; alumni, donation, dark mode
and interaction-state screenshots are not added by T09.

`DFLH_IOS_VISUAL_DEVICE='Codex iPhone 15' npm run visual-check-ios:capture`
built successfully and reported all four screens changed against the old
baselines, with no missing images. Reviewed each capture for clipping, row and
tab alignment, message wrapping and timestamp placement, then promoted the four
images with `npm run visual-check-ios:update-baseline`. The subsequent
`npm run visual-check-ios` passed with four unchanged captures, zero changed
pixels and no accepted-delta bypass or tolerance increase. Regenerated the
aggregate manifest with `npm run generate-visual-baseline-manifest`. The final
`npm run verify-design-system` passed, including Android/iOS compliance,
generated-token freshness and contract-doc freshness. The required generic iOS
simulator `xcodebuild` also reported `BUILD SUCCEEDED`.


## Latest verification result
- runMode: guard
- generatedAt: 2026-09-30T16:16:16.073Z
- pending items:
- iOS-Feed-mobile.png: changed
- iOS-MessagesList-mobile.png: changed
- iOS-MyPage-mobile.png: changed
- action: review baseline/capture/diff images; fix regressions or document intentional changes before updating baselines.

## 2026-10-01 — App UX review (feature/app-ux-review) baseline refresh
The guard run above flagged Feed, MessagesList and MyPage. Each capture was
compared with its baseline and diff image; every change is intentional:

- iOS-Feed-mobile.png: the per-post 공지 chip is removed (2026-09-29 request),
  so the post body moves up and the comment input bar now shows above the tab
  bar. Tabs are built from loaded feed categories, like Android; the visual
  fixture only has notice and scholarship posts, so the tabs are 전체 · 공지 · 장학.
- iOS-MessagesList-mobile.png: the new-message FAB glyph is "+" to match
  Android (UX review G).
- iOS-MyPage-mobile.png: a single business-card action (b16abf7, 2026-09-23)
  replaces the 내 명함 / 동문에게 보이는 화면 pair; the fixture has no card, so it
  reads 명함 등록. The old baseline predates that change.

No clipping, overlap or alignment regressions were found. Baselines were
promoted with `npm run visual-check-ios:update-baseline` after user approval.

## 2026-10-08 — Native message unread recipient count

The user requested a KakaoTalk-style number beside sent bubbles, with the integer
representing other participants who have not read the message in future group chats.
Reviewed fresh light and dark screenshots on Codex iPhone 15 (iOS 26.0, Korean,
Large text, 9:41). The amber count is left of the bubble, right-aligned above its
time; the old 읽음 label is removed. No clipping or overlap was found.

Only `iOS-MessagesThread-mobile.png` was promoted, using the baseline-update command
with the manifest scoped to `screen.messages.thread`, followed by a passing scoped
guard. The manifest's pre-existing working-tree edit was preserved byte-for-byte.
A fresh parent build at `9de86b5` was captured on the same simulator: parent/current
Feed and MyPage pixels are identical with a three-second settling delay. The only
parent/current thread difference is 1,038 pixels in the count/time metadata area.
The previous thread baseline also predates an existing bottom safe-area background
change; the new thread image reflects current main plus the requested receipt.

The fresh full-screen capture guard detected pre-existing Feed and MyPage baseline
drift; their baselines, tracked captures and screen implementations were left
unchanged. Its 1.8-second capture
also caught Feed before the fixture's expanded WebView settled; the parent/current
comparison uses three seconds. iOS focused tests: 49 passed; Android message and
component tests: 108 passed, including exact group counts and light/dark placement.
The iOS read-event regression found stale cached records taking precedence over
fresh server read state; latest-page records now win while older pages remain.
