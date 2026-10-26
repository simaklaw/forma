#!/usr/bin/env python3
"""Validate every packaged FitPulse premium-exercise pilot GIF before APK build.

This verifies technical asset contracts (dimensions, frames, transparency, timing,
looping and basic motion variation). It does not certify biomechanical accuracy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

SIZE = (384, 384)
FRAME_COUNT = 30
MIN_UNIQUE_FRAMES = 6
MIN_DURATION_MS = 1_000
MAX_DURATION_MS = 30_000
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_TOTAL_BYTES = 25 * 1024 * 1024
MIN_VISIBLE_PIXELS = 1_000

MOTIONS = (
    "pull-up",
    "bench-leg-pull-in",
    "bicep-curl",
    "front-squat",
    "one-arm-kettlebell-row",
)
VARIANTS = ("male", "female")


def validate_file(path: Path) -> tuple[dict, list[str]]:
    errors: list[str] = []
    result: dict = {"path": path.as_posix(), "valid": False}

    if not path.is_file():
        return result, [f"{path}: required pilot asset is missing"]

    size_bytes = path.stat().st_size
    result["sizeBytes"] = size_bytes
    if size_bytes <= 0:
        errors.append(f"{path}: file is empty")
    if size_bytes > MAX_FILE_BYTES:
        errors.append(f"{path}: {size_bytes} bytes exceeds {MAX_FILE_BYTES}-byte file budget")

    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    result["sha256"] = digest.hexdigest()

    try:
        with Image.open(path) as image:
            result["format"] = image.format
            result["width"], result["height"] = image.size
            result["frames"] = int(getattr(image, "n_frames", 1))
            result["loop"] = image.info.get("loop")

            if image.format != "GIF":
                errors.append(f"{path}: expected GIF, got {image.format}")
            if image.size != SIZE:
                errors.append(f"{path}: expected {SIZE[0]}x{SIZE[1]}, got {image.size[0]}x{image.size[1]}")
            if result["frames"] != FRAME_COUNT:
                errors.append(f"{path}: expected {FRAME_COUNT} frames, got {result['frames']}")
            if result["loop"] != 0:
                errors.append(f"{path}: expected an infinite loop (GIF loop=0), got {result['loop']}")
            if image.info.get("transparency") is None:
                errors.append(f"{path}: GIF transparency metadata is missing")

            total_duration_ms = 0
            unique_frames: set[str] = set()
            min_visible = None
            frame_count = result["frames"]
            for frame_index in range(frame_count):
                image.seek(frame_index)
                frame = image.convert("RGBA")
                alpha_hist = frame.getchannel("A").histogram()
                transparent_pixels = alpha_hist[0]
                visible_pixels = sum(alpha_hist[1:])
                if transparent_pixels <= 0:
                    errors.append(f"{path}: frame {frame_index} has no transparent pixels")
                if visible_pixels < MIN_VISIBLE_PIXELS:
                    errors.append(
                        f"{path}: frame {frame_index} contains only {visible_pixels} visible pixels"
                    )
                min_visible = visible_pixels if min_visible is None else min(min_visible, visible_pixels)

                frame_duration = int(image.info.get("duration", 0) or 0)
                if frame_duration <= 0:
                    errors.append(f"{path}: frame {frame_index} has no positive display duration")
                total_duration_ms += frame_duration
                unique_frames.add(hashlib.sha256(frame.tobytes()).hexdigest())

            result["durationMs"] = total_duration_ms
            result["uniqueFrames"] = len(unique_frames)
            result["minVisiblePixels"] = min_visible
            if total_duration_ms < MIN_DURATION_MS or total_duration_ms > MAX_DURATION_MS:
                errors.append(
                    f"{path}: duration {total_duration_ms} ms is outside "
                    f"{MIN_DURATION_MS}..{MAX_DURATION_MS} ms"
                )
            if len(unique_frames) < MIN_UNIQUE_FRAMES:
                errors.append(
                    f"{path}: only {len(unique_frames)} unique decoded frames; "
                    f"at least {MIN_UNIQUE_FRAMES} required"
                )
    except (OSError, ValueError) as exc:
        errors.append(f"{path}: cannot decode GIF: {exc}")

    result["valid"] = not errors
    result["errors"] = errors
    return result, errors


def build_report(asset_dir: Path) -> tuple[dict, list[str]]:
    results: list[dict] = []
    errors: list[str] = []
    for variant in VARIANTS:
        for motion in MOTIONS:
            result, file_errors = validate_file(asset_dir / variant / f"{motion}.gif")
            results.append(result)
            errors.extend(file_errors)

    total_bytes = sum(int(item.get("sizeBytes", 0)) for item in results)
    if total_bytes > MAX_TOTAL_BYTES:
        errors.append(
            f"Pilot total is {total_bytes} bytes, exceeding {MAX_TOTAL_BYTES}-byte APK asset budget"
        )

    report = {
        "schemaVersion": 1,
        "source": "RepDB preview WebP converted to local GIF for technical pilot",
        "contract": {
            "dimensions": list(SIZE),
            "framesPerAnimation": FRAME_COUNT,
            "variants": list(VARIANTS),
            "motions": list(MOTIONS),
            "minimumUniqueFrames": MIN_UNIQUE_FRAMES,
            "infiniteLoopRequired": True,
            "transparentBackgroundRequired": True,
            "maxFileBytes": MAX_FILE_BYTES,
            "maxTotalBytes": MAX_TOTAL_BYTES,
        },
        "summary": {
            "expectedAssets": len(VARIANTS) * len(MOTIONS),
            "validatedAssets": sum(1 for item in results if item.get("valid")),
            "totalBytes": total_bytes,
            "pass": not errors,
        },
        "assets": results,
        "errors": errors,
        "limitation": "Technical checks do not approve exercise identity or biomechanical correctness.",
    }
    return report, errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("asset_dir", type=Path, help="Directory containing male/ and female/ GIF folders")
    parser.add_argument("--report", type=Path, help="Optional path to write the JSON validation report")
    parser.add_argument("--summary", type=Path, help="Optional GitHub Actions summary file")
    args = parser.parse_args()

    report, errors = build_report(args.asset_dir)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")
    print(rendered, end="")

    if args.summary:
        args.summary.parent.mkdir(parents=True, exist_ok=True)
        summary = report["summary"]
        lines = [
            "## Premium exercise pilot — technical asset validation",
            "",
            f"- Result: **{'PASS' if summary['pass'] else 'FAIL'}**",
            f"- Validated assets: **{summary['validatedAssets']}/{summary['expectedAssets']}**",
            f"- Total GIF size: **{summary['totalBytes'] / (1024 * 1024):.2f} MiB**",
            "- Scope: dimensions, frame count, looping, transparency, timing, decoded-frame variation and size budget",
            "- Limitation: this does not certify correct exercise technique or final Android rendering",
            "",
        ]
        if errors:
            lines.extend(["### Failures", ""])
            lines.extend(f"- {error}" for error in errors)
            lines.append("")
        with args.summary.open("a", encoding="utf-8") as stream:
            stream.write("\n".join(lines))

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
