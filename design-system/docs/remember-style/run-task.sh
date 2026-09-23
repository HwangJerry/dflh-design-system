#!/usr/bin/env bash
# Usage: run-task.sh T01-tokens  → runs Codex headless on the task, logs to logs/<task>.log, final report to logs/<task>.report.md
set -euo pipefail
ROOT=/Users/jerryhwang/Workspace/03_daeil
DIR=$ROOT/design-system/docs/remember-style
TASK=$1
mkdir -p "$DIR/logs"
cat "$DIR/tasks/_PREAMBLE.md" "$DIR/tasks/$TASK.md" | \
  caffeinate -i codex exec --dangerously-bypass-approvals-and-sandbox -C "$ROOT" \
    --add-dir "$ROOT/dflh-saf-v2" --add-dir "$ROOT/dflh-saf-v2-kotlin" --add-dir "$ROOT/dflh-saf-v2-swift" \
    -o "$DIR/logs/$TASK.report.md" - > "$DIR/logs/$TASK.log" 2>&1
echo "exit=$? task=$TASK"
