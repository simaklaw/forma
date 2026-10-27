from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SYNC_SCRIPT = ROOT / ".github" / "scripts" / "sync-fitpulse-animation-media.py"
WORKFLOW = ROOT / ".github" / "workflows" / "sync-fitpulse-animation-media.yml"

spec = importlib.util.spec_from_file_location("fitpulse_media_sync", SYNC_SCRIPT)
assert spec and spec.loader
media_sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media_sync)


class FitPulseMediaSyncTests(unittest.TestCase):
    def test_accepts_only_paths_inside_published_fitpulse_assets(self):
        good = "assets/fitpulse/pull-up/male/pull_up.mp4"
        self.assertEqual(
            media_sync.source_url(good),
            f"{media_sync.SOURCE_BASE}/{good}",
        )
        for bad in (
            "../secrets.txt",
            "/etc/passwd",
            "assets/fitpulse/../private.bin",
            "other-repository/video.mp4",
        ):
            with self.subTest(path=bad):
                with self.assertRaisesRegex(RuntimeError, "Unsafe media path"):
                    media_sync.source_url(bad)

    def test_rejects_malformed_or_mismatched_sha256(self):
        payload = b"original renderer output"
        expected = hashlib.sha256(payload).hexdigest()
        media_sync.verify_digest(payload, expected, "fixture")
        with self.assertRaisesRegex(RuntimeError, "SHA-256 mismatch"):
            media_sync.verify_digest(payload + b"!", expected, "fixture")
        with self.assertRaisesRegex(RuntimeError, "Invalid SHA-256"):
            media_sync.verify_digest(payload, "not-a-hash", "fixture")

    def test_mobile_symlink_points_to_public_asset_with_relative_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            public = root / "apps" / "web" / "public" / "exercises" / "pullup-male.mp4"
            mobile = root / "apps" / "mobile" / "assets" / "exercises" / "pullup-male.mp4"
            public.parent.mkdir(parents=True)
            public.write_bytes(b"test mp4")
            media_sync.link_asset(public, mobile)
            self.assertTrue(mobile.is_symlink())
            self.assertEqual(mobile.resolve(), public.resolve())
            self.assertFalse(Path(mobile.readlink()).is_absolute())

    def test_sync_workflow_has_manual_hourlyish_and_main_update_triggers(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", workflow)
        self.assertIn('cron: "17 * * * *"', workflow)
        self.assertIn("branches:", workflow)
        self.assertIn("- main", workflow)
        self.assertIn(".github/workflows/sync-fitpulse-animation-media.yml", workflow)
        self.assertIn("peter-evans/create-pull-request@v7", workflow)

    def test_sync_script_checks_provenance_video_metadata_hashes_and_png(self):
        source = SYNC_SCRIPT.read_text(encoding="utf-8")
        for required in (
            "generatedFrom",
            "sourceRepository",
            '"fps") != 30',
            '"frames") != spec["frames"]',
            "videoSha256",
            "posterSha256",
            "videoBytes",
            "b\\\"ftyp\\\"",
            "b\\\"\\\\x89PNG\\\\r\\\\n\\\\x1a\\\\n\\\"",
            "sourceMotions",
            "attribution",
        ):
            with self.subTest(required=required):
                self.assertIn(required, source)


if __name__ == "__main__":
    unittest.main()
