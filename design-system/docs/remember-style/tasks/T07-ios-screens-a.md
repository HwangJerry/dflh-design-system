# T07 — iOS screens: 소식, 동문, 동문 상세 (dflh-saf-v2-swift only)

Prerequisite: T04 components exist. Scope: Feature/Feed, Feature/Alumni (+ previews/tests).
Implement SPEC §5.1, §5.2, §5.3 with the T04 components, following Main.dc.html / Alumni.dc.html / AlumniDetail.dc.html.
Same functional constraints as the Android task: keep inline expansion/comments/likes/banner ad/pagination/deep links
on Feed; SegmentedTabs presets + FilterRow + PersonRow list + 본인 chip on Alumni (필터 opens existing menus in a
sheet); detail hero + actions (쪽지 보내기 → existing navigation, 명함 보기 → existing card view) + key-value sections;
adaptive (rail / list-detail) layouts keep working.
Verify: xcodebuild per AGENTS.md; npm run verify-ios-design-system at workspace root. Commit in dflh-saf-v2-swift.
