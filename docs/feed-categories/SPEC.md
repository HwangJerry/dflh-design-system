# Feed categories — implementation spec

Source: approved screen spec (Claude Design canvas "피드 카테고리 관리 화면 정의서",
2026-09-29). Screens: A 피드 카테고리 관리 (new), B 공지 작성·수정 category
select, C 공지 관리 list category column + filter, D delete-with-move dialog.
Open questions were accepted with the spec's defaults: menu stays "공지 관리";
name 1–8 chars; max 6 categories; hidden categories' posts still show under 전체;
deleting a category with posts moves them to a chosen category.

## Rules

| Rule | Behaviour |
|---|---|
| Seed | Two categories: `notice` "공지" (default, sort 1) and `etc` "기타" (sort 2). Existing posts have no category row value and count as the default. |
| Default | Exactly one default (`notice`). Rename allowed; delete and hide refused (400). New posts preselect it. |
| Name | Required, trimmed 1–8 characters (Unicode code points), unique among categories (case-insensitive). |
| Count | At most 6 categories; create beyond that → 400. |
| Order | `SORT_ORDER` ascending; admin reorders by drag (full ordered list of seqs). App tabs follow it. |
| App tab visibility (`openYn`) | `N` removes the category from app tabs and from the admin post-edit select (except the post's current category, shown with "(숨김)"). Posts keep showing under 전체 with their category name. |
| Rename | Takes effect everywhere immediately (names are joined at read time). |
| Delete | No posts → plain confirm, delete. Has posts → `moveToSeq` required (must be another existing category); move posts and delete in one transaction. |
| Code | Stable string key sent to apps as `category`. Seeds use `notice`, `etc`; created ones get `c<seq>`. Never changes on rename. |

## Data (migration 079, MariaDB)

- New table `ALUMNI_FEED_CATEGORY`:
  `FC_SEQ INT AUTO_INCREMENT PK`, `FC_CODE VARCHAR(20) NOT NULL UNIQUE`,
  `FC_NAME VARCHAR(20) NOT NULL`, `SORT_ORDER INT NOT NULL`,
  `OPEN_YN ENUM('Y','N') NOT NULL DEFAULT 'Y'`, `IS_DEFAULT ENUM('Y','N') NOT NULL DEFAULT 'N'`,
  `REG_DATE DATETIME`, `UPD_DATE DATETIME`. Seed the two rows.
- `WEO_BOARDBBS` gains `FEED_CATEGORY_SEQ INT NULL` (index). `NULL` = default category.
  Only NOTICE-gate rows use it.
- Update the migration source-approval manifest the same way 078 was (see
  `backend/migrations/testdata/canonical_identity_candidate_lineage.sha256`,
  `internal/contract/migration_source_approval_test.go`, `.env.example`).
- Account erasure is unaffected (categories hold no personal data).

## Public feed API (apps)

All additive; old clients ignore new fields.

- `GET /api/feed` response gains `categories`: ordered array of the categories
  with `openYn='Y'`: `[{"code":"notice","name":"공지"},{"code":"etc","name":"기타"}]`.
- Every feed item (`/api/feed` items, `/api/feed/hero`) and `GET /api/feed/{seq}`
  detail gain `category` (code) and `categoryName` (name), resolved with the
  default category when `FEED_CATEGORY_SEQ` is NULL or points nowhere.
- Server-side filtering is not added; apps filter locally as today.

## Admin API (all under the existing admin auth; mirror the job-category handlers)

- `GET /api/admin/feed-categories` → `[{seq, code, name, sortOrder, openYn, isDefault, postCount}]` ordered.
- `POST /api/admin/feed-categories` `{name, openYn}` → created row.
- `PUT /api/admin/feed-categories/{seq}` `{name, openYn}`.
- `PUT /api/admin/feed-categories/order` `{seqs: [..all seqs in new order..]}`.
- `DELETE /api/admin/feed-categories/{seq}` body `{moveToSeq?: number}`; 409 with
  `{error, postCount}` when posts exist and `moveToSeq` is missing.
- Errors are 400 with Korean messages the UI shows as-is: "이미 있는 카테고리 이름입니다.",
  "카테고리는 최대 6개까지 만들 수 있습니다.", "기본 카테고리는 삭제할 수 없습니다.",
  "기본 카테고리는 숨길 수 없습니다.", "카테고리 이름은 1~8자로 입력하세요."
- Existing `/api/admin/feed` (notice) endpoints: create/update accept `categorySeq`
  (optional; missing = default; unknown → 400); list items and detail return
  `categorySeq` and `categoryName`; list accepts `?category=<seq>` filter.

## Admin UI (dflh-saf-v2/admin)

- A: new page `/feed-categories` "피드 카테고리 관리", nav item "피드 카테고리" in the
  콘텐츠 group right after 공지 관리. Same table / inline edit / dnd-kit reorder pattern as
  `JobCategoryPage`. Columns: handle, #, 이름 (+ "기본" badge), 게시글 수, 앱 탭 노출, 작업
  (수정, 삭제). Default row: delete disabled with label "기본 카테고리는 삭제할 수 없습니다",
  노출 toggle disabled. Add disabled at 6. Helper line under the title with count "(n / 최대 6개)".
  Errors shown under the table in error text.
- D: delete. No posts → existing `ConfirmDialog`. Posts → dialog "'<name>' 카테고리 삭제", text
  with post count, "옮길 카테고리" select (others, default preselected), buttons 취소 / 옮기고 삭제.
- B: `NoticeEditPage` gets a required "카테고리" select left of the title (open categories in
  order, plus the post's current hidden one suffixed "(숨김)"), default preselected on new posts,
  last option "카테고리 관리" opens `/feed-categories` in a new tab. Legacy (HTML) posts also get
  the select so old posts can be reclassified (save only the category for them).
- C: `NoticeListPage` gets a "카테고리: 전체" filter left of the search (all categories incl.
  hidden), kept in the URL as `?category=`, and a 카테고리 column after 제목 showing the name as a
  muted badge.

## Apps (iOS + Android, same behaviour)

- Decode `categories` from the feed response and `category` / `categoryName` on items.
- Label: use `categoryName` when present; otherwise the current built-in mapping
  (공지/장학/동문/행사, raw code otherwise). Missing category still counts as `notice`.
- Tabs: 전체 + categories present in loaded posts. When the response carried `categories`,
  order tabs by that list and drop codes not in it (hidden), and take tab labels from it;
  posts with a hidden category remain under 전체. Without `categories` (older server),
  keep today's ordering.
- Card: grey text under the author = category label (both platforms already do this).
- No badge/chip on cards (already removed).

## Web user site (dflh-saf-v2/frontend)

- `NoticeCard` shows `categoryName` when present, else today's label mapping.
