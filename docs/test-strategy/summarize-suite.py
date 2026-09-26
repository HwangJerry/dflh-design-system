#!/usr/bin/env python3
"""Append one coverage-summary row from the current suite's test artifacts."""

import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def backend_metrics(log, workspace, started):
    counts = {"pass": 0, "fail": 0, "skip": 0}
    for line in log.splitlines():
        if not line.startswith("{"):
            continue
        event = json.loads(line)
        if event.get("Test") and event.get("Action") in counts:
            counts[event["Action"]] += 1
    if not sum(counts.values()):
        raise ValueError("no Go test results")
    totals = re.findall(r"^total:\s+\(statements\)\s+(\S+)", log, re.MULTILINE)
    coverage = f"Statements {totals[-1]}" if totals else "unavailable"
    return (*counts.values(), coverage)


def require_fresh(path, started):
    if path.stat().st_mtime < started:
        raise ValueError("stale report")
    return path


def android_metrics(log, workspace, started):
    build = workspace / "dflh-saf-v2-kotlin/app/build"
    reports = sorted((build / "test-results/testDebugUnitTest").glob("TEST-*.xml"))
    if not reports:
        raise ValueError("no Android test results")
    total = failed = skipped = 0
    for report in reports:
        root = ET.parse(require_fresh(report, started)).getroot()
        total += int(root.attrib["tests"])
        failed += int(root.attrib["failures"]) + int(root.attrib["errors"])
        skipped += int(root.attrib.get("skipped", 0))
    coverage = "unavailable"
    report = build / "reports/kover/reportDebug.xml"
    if report.exists() and report.stat().st_mtime >= started:
        counters = {counter.attrib["type"]: counter.attrib for counter in ET.parse(report).getroot().findall("counter")}
        totals = []
        for kind in ("LINE", "BRANCH"):
            counter = counters[kind]
            covered = int(counter["covered"])
            executable = covered + int(counter["missed"])
            if not executable:
                raise ValueError("empty Kover coverage")
            totals.append(f"{kind.title()} {100 * covered / executable:.2f}% ({covered}/{executable})")
        coverage = "; ".join(totals)
    return total - failed - skipped, failed, skipped, coverage


def ios_metrics(log, workspace, started):
    bundle = require_fresh(workspace / "dflh-saf-v2-swift/build/coverage/Unit.xcresult", started)
    result = subprocess.run(
        ["xcrun", "xcresulttool", "get", "test-results", "summary", "--path", str(bundle), "--compact"],
        capture_output=True, text=True, check=True,
    )
    counts = json.loads(result.stdout)
    totals = re.findall(r"^TOTAL Sources/App\s+(\S+)\s+(\d+) / (\d+)", log, re.MULTILINE)
    coverage = "unavailable"
    if totals:
        percent, covered, executable = totals[-1]
        coverage = f"Lines {percent} ({covered}/{executable})"
    return counts["passedTests"], counts["failedTests"], counts["skippedTests"], coverage


def main():
    suite, status, log_path, workspace, started = sys.argv[1:]
    log_path = Path(log_path)
    passed = failed = skipped = "—"
    coverage = "unavailable"
    note = ""
    try:
        parser = {"backend": backend_metrics, "android": android_metrics, "ios": ios_metrics}[suite]
        passed, failed, skipped, coverage = parser(log_path.read_text(), Path(workspace), float(started))
        if not passed + failed + skipped:
            note = "; no tests reported"
        elif coverage == "unavailable":
            note = "; coverage unavailable"
    except (OSError, ValueError, KeyError, ET.ParseError, subprocess.SubprocessError):
        note = "; current reports unavailable"
    success = status == "0" and failed == 0 and not note
    result = "PASS" if success else f"FAIL (exit {status}{note})"
    link = f"[{suite}]({log_path.parent.name}/{log_path.name})"
    print(f"| {suite} | {result} | {passed} | {failed} | {skipped} | {coverage} | {link} |")
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
