#!/usr/bin/env bash
# Usage: run-task.sh <TASK> → detached Codex run; log logs/<TASK>.log, report logs/<TASK>.report.md, marker logs/<TASK>.done
set -uo pipefail
ROOT=/Users/jerryhwang/Workspace/03_daeil
DIR=$ROOT/docs/test-strategy
TASK=$1
mkdir -p "$DIR/logs"; rm -f "$DIR/logs/$TASK.done"
(
  cat "$DIR/tasks/_PREAMBLE.md" "$DIR/tasks/$TASK.md" | \
    caffeinate -i codex exec --dangerously-bypass-approvals-and-sandbox -C "$ROOT" \
      --add-dir "$ROOT/dflh-saf-v2" --add-dir "$ROOT/dflh-saf-v2-kotlin" --add-dir "$ROOT/dflh-saf-v2-swift" \
      -o "$DIR/logs/$TASK.report.md" - > "$DIR/logs/$TASK.log" 2>&1
  echo "exit=$?" > "$DIR/logs/$TASK.done"
) &
disown
echo "started $TASK pid=$!"
