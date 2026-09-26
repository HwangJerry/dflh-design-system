#!/usr/bin/env python3
"""Exercise fixture synchronization in a temporary, synthetic workspace."""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent


class GoldenSyncTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="ts08 golden sync ")
        self.addCleanup(self.temporary.cleanup)
        self.workspace = Path(self.temporary.name)
        self.scripts = self.workspace / "docs/test-strategy"
        self.scripts.mkdir(parents=True)
        for name in ("sync-golden.sh", "test-all.sh"):
            shutil.copyfile(SCRIPTS / name, self.scripts / name)
        self.backend = self.workspace / "dflh-saf-v2"
        self.source = self.backend / "backend/cmd/server/testdata/golden"
        self.source.mkdir(parents=True)
        (self.source / "sample.json").write_text('{"available":true}\n')
        self.git("init", "-q")
        self.git("add", "backend")
        self.git("-c", "user.name=Contract Test", "-c", "user.email=contract@example.test",
                 "-c", "core.hooksPath=/dev/null", "commit", "--no-gpg-sign", "-qm", "test: synthetic golden")
        self.destinations = [
            self.workspace / "dflh-saf-v2-swift/Tests/DflhSafV2SwiftTests/Fixtures/golden",
            self.workspace / "dflh-saf-v2-kotlin/app/src/test/resources/golden",
        ]

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.backend), *args], text=True).strip()

    def run_sync(self, *args):
        return subprocess.run(["bash", str(self.scripts / "sync-golden.sh"), *args],
                              cwd=self.temporary.name, capture_output=True, text=True)

    def snapshot(self):
        return {str(path): (path.read_bytes(), path.stat().st_mtime_ns)
                for destination in self.destinations for path in destination.rglob("*") if path.is_file()}

    def test_sync_copies_bytes_and_records_provenance(self):
        self.assertEqual(self.run_sync().returncode, 0)
        for destination in self.destinations:
            self.assertEqual((destination / "sample.json").read_bytes(), (self.source / "sample.json").read_bytes())
            source = (destination / "SOURCE.md").read_text()
            self.assertIn(self.git("rev-parse", "HEAD"), source)
            self.assertRegex(source, r"Synced: \d{4}-\d{2}-\d{2} \(UTC\)")
            self.assertIn("Do not edit", source)
            self.assertIn("sync-golden.sh", source)
        before = self.snapshot()
        self.assertEqual(self.run_sync("--check").returncode, 0)
        self.assertEqual(self.snapshot(), before)

    def test_check_lists_all_differences_without_writing(self):
        self.assertEqual(self.run_sync().returncode, 0)
        ios, android = self.destinations
        (ios / "sample.json").write_text('{"available":false}\n')
        (android / "sample.json").unlink()
        (android / "extra.json").write_text("{}\n")
        (ios / "SOURCE.md").unlink()
        before = self.snapshot()
        result = self.run_sync("--check")
        self.assertEqual(result.returncode, 1)
        for reason, path in [("changed", ios / "sample.json"), ("missing", android / "sample.json"),
                             ("extra", android / "extra.json"), ("missing", ios / "SOURCE.md")]:
            self.assertIn(f"{reason}: {path.relative_to(self.workspace)}", result.stderr)
        self.assertEqual(self.snapshot(), before)

    def test_check_does_not_create_missing_destinations(self):
        result = self.run_sync("--check")
        self.assertEqual(result.returncode, 1)
        for destination in self.destinations:
            self.assertFalse(destination.exists())
            self.assertIn(str((destination / "sample.json").relative_to(self.workspace)), result.stderr)

    def test_sync_removes_deleted_goldens(self):
        self.assertEqual(self.run_sync().returncode, 0)
        (self.source / "sample.json").rename(self.source / "renamed.json")
        self.assertEqual(self.run_sync().returncode, 0)
        self.assertEqual(self.run_sync("--check").returncode, 0)
        for destination in self.destinations:
            self.assertFalse((destination / "sample.json").exists())
            self.assertTrue((destination / "renamed.json").is_file())

    def test_empty_source_and_bad_arguments_fail_without_writing(self):
        self.assertEqual(self.run_sync().returncode, 0)
        (self.source / "sample.json").unlink()
        before = self.snapshot()
        self.assertEqual(self.run_sync().returncode, 1)
        self.assertEqual(self.run_sync("--check").returncode, 1)
        self.assertEqual(self.run_sync("--unknown").returncode, 2)
        self.assertEqual(self.run_sync("--check", "extra").returncode, 2)
        self.assertEqual(self.snapshot(), before)

    def test_runner_reports_sync_first_and_continues_after_drift(self):
        self.assertEqual(self.run_sync().returncode, 0)
        coverage = self.workspace / "dflh-saf-v2-swift/scripts/test-coverage.sh"
        coverage.parent.mkdir(parents=True)
        coverage.write_text("#!/bin/bash\nprintf 'synthetic iOS suite ran\\n'\n")
        (self.scripts / "summarize-suite.py").write_text(
            'print("| ios | PASS | 1 | 0 | 0 | synthetic coverage | test |")\n'
        )
        for expected_status in (0, 1):
            if expected_status:
                (self.destinations[0] / "sample.json").write_text("{}\n")
            result = subprocess.run(["bash", str(self.scripts / "test-all.sh"), "--only", "ios"],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, expected_status, result.stdout + result.stderr)
            summary_path = Path(result.stdout.split("Summary: ", 1)[1].splitlines()[0])
            rows = [line for line in summary_path.read_text().splitlines() if line.startswith("| ")][1:]
            self.assertTrue(rows[0].startswith("| contract-sync | " + ("FAIL" if expected_status else "PASS")))
            self.assertTrue(rows[-1].startswith("| ios | PASS"))
            self.assertIn("synthetic iOS suite ran", next((self.scripts / "logs").glob(
                f"run-{summary_path.stem.removeprefix('summary-')}/ios.log")).read_text())


if __name__ == "__main__":
    unittest.main()
