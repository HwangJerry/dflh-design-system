# Context (read first)

You are implementing one unit of the test-coverage plan for the DFLH alumni app.
Workspace root: /Users/jerryhwang/Workspace/03_daeil. Plan: docs/test-strategy/PLAN.md (read it).
Nested git repos, each currently on `main` with a clean tree:
- dflh-saf-v2/            Go backend (backend/) + React admin/frontend — see its CLAUDE.md
- dflh-saf-v2-kotlin/     Android (Jetpack Compose) — see AGENTS.md
- dflh-saf-v2-swift/      iOS (SwiftUI) — see AGENTS.md and CLAUDE.md
- design-system/          shared tokens/contracts (do not touch unless the task says so)

Rules
- Before editing a repo, create and switch to the branch named in the task (from `main`). Never commit to `main`. Do not merge. Do not push.
- Stay inside the task's scope. Production behaviour must not change unless the task says so; guards you add must be no-ops in release/production builds.
- Never read, print, or copy secrets or production data (keystores, .p8 keys, .env files, /etc/sysconfig, DB dumps, prod-db-backups/, *production-schema*.sql). Tests use synthetic data only.
- Never contact production (daeilfoundation.or.kr) from tests. Tests must pass offline except Docker-based ones, which must skip cleanly when Docker is unavailable.
- Match the surrounding code style and comment density. Prefer small focused helpers over frameworks.
- Run the verification commands listed in the task and fix failures. If something cannot pass, say exactly why.
- Commit with Conventional Commit messages ending with the line: Co-Authored-By: Codex <noreply@openai.com>
- Finish with a short report: branch, files changed, commands run with results (test counts), anything left open.

Machine notes
- Android SDK: use `ANDROID_HOME` from dflh-saf-v2-kotlin/fastlane/.env.default (read only that one variable line), or ~/Library/Android/sdk.
- iOS: use the simulator "iPhone 17". Regenerate the Xcode project with `xcodegen generate` after adding/removing Swift files (project.pbxproj is tracked; `git add -u` it, the .xcodeproj dir is gitignored).
- Go backend: run from dflh-saf-v2/backend.
