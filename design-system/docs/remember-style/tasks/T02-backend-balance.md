# T02 — Donation summary: monthAmount + account balance (dflh-saf-v2 only)

Scope: dflh-saf-v2/backend and dflh-saf-v2/admin. Do not touch frontend/ or the mobile repos.

1. Donation config: add `dcBalanceAmount` (BIGINT NULL) and `dcBalanceAsOf` (DATE NULL) to the donation config table
   via a new SQL migration in the project's existing migration location/convention (MariaDB 10.1.38 compatible), model
   field(s), repository read/write (getActiveDonationConfig / updateDonationConfig), admin handler validation
   (amount ≥ 0 integer; asOf required when amount present; ISO date), and the admin API types.
2. Public API `GET /api/donation/summary` (model.DonationSummary): add `monthAmount int64` (sum of donations in the
   current calendar month, Asia/Seoul, from the same source used for displayAmount; if that source is a snapshot
   without dated rows, compute from the dated donation records repository already used elsewhere and document the
   choice), `balanceAmount *int64` and `balanceAsOf *string` (YYYY-MM-DD) taken from the active config. Keep
   donorCount in the payload for compatibility (mobile will stop displaying it).
3. Admin SPA: in admin/src/components/donation/DonationConfigSection.tsx (and its hook/types) add inputs
   "계좌 잔액(원)" and "잔액 기준일" with the same validation, formatted preview via formatAmount, and update tests
   under admin/src/__tests__ accordingly.
4. Tests: repository/service/handler unit tests for the new fields and for monthAmount month-boundary behaviour.
5. Verify: (cd backend && go test ./... && go vet ./...) ; (cd admin && npm run lint && npm run build).
Update docs/ API notes if the repo keeps an API doc for donation summary. Commit in dflh-saf-v2.
