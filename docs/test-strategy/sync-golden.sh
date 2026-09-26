#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  ""|--check) ;;
  *) echo "Usage: $0 [--check]" >&2; exit 2 ;;
esac
if (($# > 1)); then
  echo "Usage: $0 [--check]" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 - "$script_dir/../.." "${1:-}" <<'PY'
import datetime
import shutil
import subprocess
import sys
from pathlib import Path

workspace = Path(sys.argv[1]).resolve()
check = sys.argv[2] == "--check"
backend = workspace / "dflh-saf-v2"
source = backend / "backend/cmd/server/testdata/golden"
goldens = {path.name: path for path in source.glob("*.json")}
if not goldens:
    sys.exit(f"No backend goldens found: {source}")
destinations = [
    workspace / "dflh-saf-v2-swift/Tests/DflhSafV2SwiftTests/Fixtures/golden",
    workspace / "dflh-saf-v2-kotlin/app/src/test/resources/golden",
]

if check:
    differences = []
    for destination in destinations:
        copies = {path.name: path for path in destination.glob("*.json")}
        for name in sorted(goldens.keys() | copies.keys()):
            path = destination / name
            if name not in copies:
                reason = "missing"
            elif name not in goldens:
                reason = "extra"
            elif path.read_bytes() != goldens[name].read_bytes():
                reason = "changed"
            else:
                continue
            differences.append(f"{reason}: {path.relative_to(workspace)}")
        if not (destination / "SOURCE.md").is_file():
            differences.append(f"missing: {(destination / 'SOURCE.md').relative_to(workspace)}")
    if differences:
        print("\n".join(differences), file=sys.stderr)
        sys.exit(1)
    print(f"contract-sync: {len(goldens)} goldens match in both apps")
else:
    commit = subprocess.check_output(
        ["git", "-C", str(backend), "rev-parse", "HEAD"], text=True,
    ).strip()
    date = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    provenance = (
        "# Backend router goldens\n\n"
        f"- Backend commit: `{commit}`\n"
        f"- Synced: {date} (UTC)\n"
        "- Source: `dflh-saf-v2/backend/cmd/server/testdata/golden/*.json`\n\n"
        "Do not edit; run `docs/test-strategy/sync-golden.sh` from the workspace.\n"
    )
    for destination in destinations:
        destination.mkdir(parents=True, exist_ok=True)
        for stale in destination.glob("*.json"):
            if stale.name not in goldens:
                stale.unlink()
        for name, path in sorted(goldens.items()):
            shutil.copyfile(path, destination / name)
        (destination / "SOURCE.md").write_text(provenance)
        print(f"Synced {len(goldens)} goldens: {destination.relative_to(workspace)}")
PY
