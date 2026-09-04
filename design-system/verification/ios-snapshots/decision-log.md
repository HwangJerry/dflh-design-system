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
