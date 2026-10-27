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


    def test_validates_decoded_mp4_stream_metadata(self):
        probe = {
            "streams": [{
                "codec_type": "video",
                "width": 720,
                "height": 720,
                "avg_frame_rate": "30/1",
                "nb_read_frames": "72",
            }]
        }
        self.assertEqual(
            media_sync.validate_video_probe(probe, "pull-up/male", 72),
            {"width": 720, "height": 720, "fps": 30.0, "frames": 72},
        )

        invalid_cases = (
            ({"width": 360, "height": 360, "avg_frame_rate": "30/1", "nb_read_frames": "72"},
             "720x720"),
            ({"width": 720, "height": 720, "avg_frame_rate": "30000/1001", "nb_read_frames": "72"},
             "30 fps"),
            ({"width": 720, "height": 720, "avg_frame_rate": "30/1", "nb_read_frames": "71"},
             "expected 72 decoded frames"),
        )
        for overrides, expected_error in invalid_cases:
            with self.subTest(overrides=overrides):
                bad_probe = {"streams": [{**probe["streams"][0], **overrides}]}
                with self.assertRaisesRegex(RuntimeError, expected_error):
                    media_sync.validate_video_probe(bad_probe, "pull-up/male", 72)

    def test_rejects_missing_or_multiple_video_streams(self):
        with self.assertRaisesRegex(RuntimeError, "exactly one video stream"):
            media_sync.validate_video_probe({"streams": []}, "fixture", 72)
        with self.assertRaisesRegex(RuntimeError, "exactly one video stream"):
            media_sync.validate_video_probe(
                {"streams": [
                    {"codec_type": "video"},
                    {"codec_type": "video"},
                ]},
                "fixture",
                72,
            )

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
        self.assertIn('cron: "*/15 * * * *"', workflow)
        self.assertIn("branches:", workflow)
        self.assertIn("- main", workflow)
        self.assertIn(".github/workflows/sync-fitpulse-animation-media.yml", workflow)
        self.assertIn("peter-evans/create-pull-request@v7", workflow)
        self.assertIn("ffprobe is available", workflow)

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
            "video_data[4:8]",
            "verify_mp4_stream",
            "validate_video_probe",
            "ffprobe",
            "poster_data.startswith",
            "sourceMotions",
            "attribution",
        ):
            with self.subTest(required=required):
                self.assertIn(required, source)


if __name__ == "__main__":
    unittest.main()
