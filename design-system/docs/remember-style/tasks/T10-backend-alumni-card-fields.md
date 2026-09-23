# T10 — Alumni list API: expose company name and business card (dflh-saf-v2 only)

Scope: dflh-saf-v2/backend (+ docs/contract fixtures). Do not touch admin/, frontend/ or the mobile repos.

Why: SPEC §5.2 PersonRow shows "회사" as the third line and a 96×60 명함 thumbnail on the right, but
`GET /api/alumni` items (model.AlumniCard) only carry userSeq/name/photoUrl/cohort/department/jobCategory/jobRole.
AlumniDetail already exposes bizName and bizCardUrl.

1. Add `BizName string json:"bizName"` and `BizCardURL *string json:"bizCardUrl"` to model.AlumniCard and populate them
   in the alumni search repository query (same columns/resolution used for AlumniDetail; respect the same visibility
   rules — if the detail endpoint hides the card for blocked users or non-public data, apply the same rule here).
2. Keep the list query efficient (single query; no N+1). Update repository/handler tests and the API contract
   fixtures/docs (docs/contracts/fixtures, docs/mvp-api-contract.md, docs/spec-api.md) so contract tests pass.
3. Verify: (cd backend && go test ./... && go vet ./...). Commit in dflh-saf-v2.
Report the exact JSON field names so the iOS DTO can be updated.
