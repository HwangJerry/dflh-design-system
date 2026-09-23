# T05 — Android screens: 소식, 동문, 동문 상세 (dflh-saf-v2-kotlin only)

Prerequisite: T03 components exist. Scope: feature/feed/ui, feature/alumni/ui (+ their previews/tests).
Implement SPEC §5.1, §5.2, §5.3 using the T03 components, following Main.dc.html / Alumni.dc.html / AlumniDetail.dc.html.
- Feed: header [search, bell] (search may open the existing search if present, else omit the action), SegmentedTabs
  over existing category values (fall back to [전체] only if the API has no category), PostCard list with 8px gaps,
  pinned notice first; keep inline expansion, comments, like, banner ad, pagination, pull-to-refresh, push deep link.
- Alumni: header, SegmentedTabs presets (전체 동문 / 같은 기수 / 같은 직종 → existing cohort/jobCategory filters using
  the signed-in user's profile values), FilterRow (전체 (N) with real totalCount; 기수순 sort if supported else omit the
  sort button; 필터 opens existing menus in a ModalBottomSheet), PersonRow list, 본인 chip for own row, keep pagination.
- Alumni detail (bottom sheet or full screen as today) with hero, action buttons (쪽지 보내기 → existing message
  navigation; 명함 보기 → existing biz card expand), key-value sections, block/report under kebab.
- Adaptive layouts (rail / master-detail on large width) must still work.
Verify: ./gradlew :app:assembleDebug testDebugUnitTest; npm run verify-android-design-system at workspace root.
Commit in dflh-saf-v2-kotlin.
