#!/usr/bin/env python3
"""Fetch and verify published FitPulse exercise media into a PR workspace."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPOSITORY = "simaklaw/fitpulse-godot-animation-studio"
EXERCISES = {
    "pull-up": {"exercise_id": "pull_up", "key": "pullup", "frames": 72},
    "push-up": {"exercise_id": "push_up", "key": "pushup", "frames": 97},
}
ROOT = Path.cwd()
SOURCE_BASE = "https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main"
PUBLIC = ROOT / "apps" / "web" / "public" / "exercises"
MOBILE = ROOT / "apps" / "mobile" / "assets" / "exercises"
MANIFEST_OUTPUT = PUBLIC / "fitpulse-animation-manifest.json"


def fetch_bytes(url: str, *, max_bytes: int = 120 * 1024 * 1024) -> bytes:
    req = Request(url, headers={"User-Agent": "FitPulse-Verified-Media-Sync/1.0"})
    with urlopen(req, timeout=120) as response:
        content_length = response.headers.get("Content-Length")
        if content_length and int(content_length) > max_bytes:
            raise RuntimeError(f"Refusing oversized payload ({content_length} bytes): {url}")
        data = response.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise RuntimeError(f"Payload exceeds {max_bytes} byte safety limit: {url}")
    return data


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_digest(data: bytes, expected: str, label: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{64}", expected or ""):
        raise RuntimeError(f"Invalid SHA-256 metadata for {label}")
    actual = sha256(data)
    if actual != expected:
        raise RuntimeError(f"SHA-256 mismatch for {label}: expected {expected}, got {actual}")


def source_url(relative_path: str) -> str:
    path = Path(relative_path)
    if path.is_absolute() or ".." in path.parts or not relative_path.startswith("assets/fitpulse/"):
        raise RuntimeError(f"Unsafe media path in published manifest: {relative_path!r}")
    return f"{SOURCE_BASE}/{relative_path}"


def link_asset(target: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_symlink() or destination.exists():
        if destination.is_dir() and not destination.is_symlink():
            raise RuntimeError(f"Refusing to replace directory with a symlink: {destination}")
        destination.unlink()
    relative_target = os.path.relpath(target, start=destination.parent)
    destination.symlink_to(relative_target)


def main() -> int:
    combined = {
        "schemaVersion": 1,
        "sourceRepository": REPOSITORY,
        "profiles": {},
        "attribution": [],
    }
    missing = []
    source_manifests = {}

    for exercise, spec in EXERCISES.items():
        manifest_path = f"assets/fitpulse/{exercise}/manifest.json"
        try:
            raw = fetch_bytes(source_url(manifest_path), max_bytes=2 * 1024 * 1024)
        except (HTTPError, URLError, TimeoutError) as exc:
            missing.append(f"{exercise}: {exc}")
            continue
        manifest = json.loads(raw.decode("utf-8"))
        if manifest.get("exerciseId") != spec["exercise_id"]:
            raise RuntimeError(
                f"{exercise}: manifest exerciseId must be {spec['exercise_id']!r}"
            )
        generated_from = manifest.get("generatedFrom", {})
        if generated_from.get("repository") != REPOSITORY:
            raise RuntimeError(f"{exercise}: unexpected media source repository")
        if generated_from.get("commit") is None or generated_from.get("workflowRunId") is None:
            raise RuntimeError(f"{exercise}: provenance metadata is incomplete")
        if manifest.get("video", {}).get("width") != 720 or manifest.get("video", {}).get("height") != 720:
            raise RuntimeError(f"{exercise}: expected 720×720 video metadata")
        if manifest.get("video", {}).get("fps") != 30:
            raise RuntimeError(f"{exercise}: expected 30 fps video metadata")
        if manifest.get("video", {}).get("frames") != spec["frames"]:
            raise RuntimeError(
                f"{exercise}: expected {spec['frames']} frames in manifest"
            )
        profiles = manifest.get("profiles", {})
        if set(profiles) != {"male", "female"}:
            raise RuntimeError(f"{exercise}: manifest must include male and female profiles")
        source_manifests[exercise] = manifest

    if missing:
        summary = (
            "FitPulse media sync skipped: the verified renderer publisher has not "
            "published all source manifests yet. No app assets were changed.\n\n"
            + "\n".join(f"- {item}" for item in missing)
        )
        print(summary)
        with open(os.environ.get("GITHUB_STEP_SUMMARY", "/dev/null"), "a", encoding="utf-8") as file:
            file.write(summary + "\n")
        return 0

    for exercise, spec in EXERCISES.items():
        manifest = source_manifests[exercise]
        for gender in ("male", "female"):
            profile = manifest["profiles"][gender]
            video_data = fetch_bytes(source_url(profile["video"]))
            poster_data = fetch_bytes(source_url(profile["poster"]), max_bytes=20 * 1024 * 1024)
            verify_digest(video_data, profile.get("videoSha256", ""), f"{exercise}/{gender} video")
            verify_digest(poster_data, profile.get("posterSha256", ""), f"{exercise}/{gender} poster")
            if profile.get("videoBytes") != len(video_data):
                raise RuntimeError(
                    f"{exercise}/{gender}: video byte length disagrees with source manifest"
                )
            if not (len(video_data) > 12 and video_data[4:8] == b"ftyp"):
                raise RuntimeError(f"{exercise}/{gender}: payload does not look like an MP4")
            if not poster_data.startswith(b"\x89PNG\r\n\x1a\n"):
                raise RuntimeError(f"{exercise}/{gender}: poster is not a PNG")
            key = spec["key"]
            video_name = f"{key}-{gender}.mp4"
            poster_name = f"{key}-{gender}.png"
            video_target = PUBLIC / video_name
            poster_target = PUBLIC / poster_name
            PUBLIC.mkdir(parents=True, exist_ok=True)
            video_target.write_bytes(video_data)
            poster_target.write_bytes(poster_data)
            link_asset(video_target, MOBILE / video_name)
            link_asset(poster_target, MOBILE / poster_name)
            combined["profiles"][f"{key}-{gender}"] = {
                "exerciseId": spec["exercise_id"],
                "gender": gender,
                "video": f"/exercises/{video_name}",
                "poster": f"/exercises/{poster_name}",
                "videoBytes": len(video_data),
                "videoSha256": sha256(video_data),
                "posterBytes": len(poster_data),
                "posterSha256": sha256(poster_data),
                "generatedFrom": generated_from if (generated_from := manifest["generatedFrom"]) else {},
            }
        for asset in manifest.get("sourceAssets", []):
            if asset not in combined["attribution"]:
                combined["attribution"].append(asset)
        source_motion = manifest.get("sourceMotion")
        if source_motion and source_motion not in combined.get("sourceMotions", []):
            combined.setdefault("sourceMotions", []).append(source_motion)

    MANIFEST_OUTPUT.write_text(json.dumps(combined, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = (
        "Verified and staged four FitPulse character-specific exercise videos plus four posters. "
        "All downloads were SHA-256 checked against the source manifests; mobile assets are symlinks "
        "to the corresponding public files.\n"
        f"Manifest: {MANIFEST_OUTPUT.relative_to(ROOT)}\n"
    )
    print(summary)
    with open(os.environ.get("GITHUB_STEP_SUMMARY", "/dev/null"), "a", encoding="utf-8") as file:
        file.write(summary)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
