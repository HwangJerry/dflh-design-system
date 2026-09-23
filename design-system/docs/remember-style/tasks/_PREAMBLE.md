# Context (read first)

You are implementing one unit of the "Remember-style UI" redesign for the DFLH alumni app.
Workspace root: /Users/jerryhwang/Workspace/03_daeil (umbrella git repo "dflh-design-system", branch feature/remember-style-ui).
Nested repos, each already on branch feature/remember-style-ui:
- dflh-saf-v2/            Go backend + React admin/frontend (see its CLAUDE.md)
- dflh-saf-v2-kotlin/     Android (Jetpack Compose) — see AGENTS.md
- dflh-saf-v2-swift/      iOS (SwiftUI) — see AGENTS.md and CLAUDE.md
- design-system/          shared tokens, contracts, verification scripts (see design-system/README.md)

Authoritative spec: design-system/docs/remember-style/SPEC.md. Pixel reference: design-system/mockups/remember-style/*.dc.html
(open them as plain HTML; inline styles carry the exact sizes and colors). Follow the spec exactly; do not redesign.

Rules
- Stay inside the task's stated scope. Do not touch other repos/files unless the task says so.
- Never hand-edit generated token files; edit design-tokens.json and run `npm run generate-design-system` at the workspace root.
- Use design-system tokens/components only; no raw hex/dp/pt literals in feature code (verification scripts block them).
- Keep existing behaviour, view models, API calls, analytics, accessibility labels and test IDs working. Update tests you break.
- Korean copy stays as in the spec/mockups.
- Run the verification commands listed in the task before finishing; fix failures. If something cannot pass, say exactly why.
- Commit your work in each repo you touched with a clear message (Conventional Commits). Do not push.
- Finish with a short report: files changed, commands run with results, anything left open.
