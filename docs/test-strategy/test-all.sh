#!/usr/bin/env bash
set -uo pipefail

usage() {
  echo "Usage: $0 [--only backend|android|ios] [--docker]"
  echo "Runs offline using cached dependencies; --docker enables the shared MariaDB tests."
}

only=""
docker_tests=0
while (($#)); do
  case "$1" in
    --only)
      if [[ $# -lt 2 || -n "$only" ]]; then
        usage >&2
        exit 2
      fi
      case "$2" in
        backend|android|ios) only="$2" ;;
        *) usage >&2; exit 2 ;;
      esac
      shift 2
      ;;
    --docker) docker_tests=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || exit 1
workspace="$(cd "$script_dir/../.." && pwd)" || exit 1
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }
mkdir -p "$script_dir/logs" || exit 1
run_dir="$(mktemp -d "$script_dir/logs/run-$(date +%Y-%m-%d-%H%M%S).XXXXXX")" || exit 1
run_name="${run_dir##*/}"
summary="$script_dir/logs/summary-${run_name#run-}.md"
export DFLH_DOCKER_TESTS="$docker_tests"

run_backend() (
  cd "$workspace/dflh-saf-v2/backend" || exit 1
  # JSON events supply counts without running the tests a second time.
  export GOFLAGS='-json -count=1' GOPROXY=off GOSUMDB=off GOTOOLCHAIN=local
  unset SOCIAL_LINK_TEST_DSN GOLDEN_UPDATE ERASURE_ISOLATED_CONTAINER
  # Legacy integrations have independent opt-ins; --docker uses the TS04 harness.
  while IFS= read -r name; do
    case "$name" in
      *_DOCKER_INTEGRATION) unset "$name" ;;
    esac
  done < <(compgen -e)
  bash scripts/test-coverage.sh
)

run_android() (
  cd "$workspace/dflh-saf-v2-kotlin" || exit 1
  # Extract only this assignment. Never source the Fastlane environment file.
  sdk="$(sed -n 's/^ANDROID_HOME=//p' fastlane/.env.default 2>/dev/null | head -n 1)"
  sdk="${sdk%\"}"; sdk="${sdk#\"}"
  sdk="${sdk%\'}"; sdk="${sdk#\'}"
  export ANDROID_HOME="${sdk:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
  if [[ ! -d "$ANDROID_HOME" ]]; then
    echo "Android SDK not found at ANDROID_HOME" >&2
    exit 1
  fi
  if [[ -x /usr/libexec/java_home ]]; then
    JAVA_HOME="$(/usr/libexec/java_home -v 17)" || exit 1
    export JAVA_HOME
  fi

  # Gradle resolves release signing during configuration, even for debug tests.
  # Hide the local keystore directory without reading or moving any credentials.
  gradle=(./gradlew)
  if [[ -e keystore/keystore.properties ]]; then
    if [[ ! -x /usr/bin/sandbox-exec ]]; then
      echo "Cannot isolate release-signing properties: sandbox-exec is unavailable" >&2
      exit 1
    fi
    keystore_path="$(python3 -c 'import json, os; print(json.dumps(os.path.realpath("keystore")))')"
    gradle=(/usr/bin/sandbox-exec -p "(version 1) (allow default) (deny file-read* (subpath $keystore_path))" ./gradlew)
  fi
  "${gradle[@]}" --offline --no-daemon --console=plain --rerun-tasks \
    :app:testDebugUnitTest :app:koverHtmlReportDebug :app:koverXmlReportDebug
)

run_ios() (
  cd "$workspace/dflh-saf-v2-swift" || exit 1
  bash scripts/test-coverage.sh
)

cat > "$summary" <<EOF
# Test coverage summary

- Started: $(date '+%Y-%m-%d %H:%M:%S %Z')
- Selection: ${only:-all}
- Docker tests: $DFLH_DOCKER_TESTS (shared MariaDB harness; unavailable Docker skips)
- Dependencies: offline/cached; iOS simulator: iPhone 17

| Suite | Result | Passed | Failed | Skipped | Coverage totals | Log |
|---|---|---:|---:|---:|---|---|
EOF

failed=0
for suite in backend android ios; do
  if [[ -n "$only" && "$only" != "$suite" ]]; then
    echo "| $suite | NOT RUN | — | — | — | — | — |" >> "$summary"
    continue
  fi
  log="$run_dir/$suite.log"
  started="$(python3 -c 'import time; print(time.time())')"
  echo "Running $suite (log: $log)"
  case "$suite" in
    backend) run_backend ;;
    android) run_android ;;
    ios) run_ios ;;
  esac > "$log" 2>&1
  status=$?
  python3 "$script_dir/summarize-suite.py" "$suite" "$status" "$log" "$workspace" "$started" >> "$summary"
  report_status=$?
  if ((status != 0 || report_status != 0)); then
    failed=1
  fi
  tail -n 1 "$summary"
done

printf '\nCounts include Go subtests; Android coverage covers the app debug variant; iOS coverage covers Sources/App.\n' >> "$summary"
echo "Summary: $summary"
cat "$summary"
exit "$failed"
