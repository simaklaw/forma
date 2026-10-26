#!/usr/bin/env python3
"""Extract and downsample the reviewed RepDB pilot animations for Android.

The source ZIP is downloaded by the APK workflow. We bundle only the five exact
movements mapped in exercisePremiumMapping.ts, in male and female variants.
This keeps the full evaluation archive out of the APK and repository history.
"""
from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

from PIL import Image

SIZE = (384, 384)
FRAME_COUNT = 30
SLOWDOWN_FACTOR = 1.12  # slightly slower loop after device review
MOTIONS = (
    "pull-up",
    "bench-leg-pull-in",
    "bicep-curl",
    "front-squat",
    "one-arm-kettlebell-row",
)
VARIANTS = {
    "male": "",
    "female": "female/",
}


def sampled_indices(frame_count: int) -> list[int]:
    if frame_count < FRAME_COUNT:
        raise ValueError(f"Need at least {FRAME_COUNT} source frames; got {frame_count}")
    return [round(i * (frame_count - 1) / (FRAME_COUNT - 1)) for i in range(FRAME_COUNT)]


def animated_webp_duration_ms(data: bytes) -> tuple[int, int]:
    """Read true per-frame durations from animated WebP ANMF chunks.

    Pillow may expose frame count but omit duration in Image.info on some
    runners. The ANMF chunk stores each frame duration as a 24-bit
    little-endian millisecond value at byte offsets 12–14 of its payload.
    """
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Source is not a RIFF/WEBP file")

    offset = 12
    total_ms = 0
    frame_count = 0
    while offset + 8 <= len(data):
        fourcc = data[offset : offset + 4]
        chunk_size = int.from_bytes(data[offset + 4 : offset + 8], "little")
        payload_start = offset + 8
        payload_end = payload_start + chunk_size
        if payload_end > len(data):
            raise ValueError("Malformed WebP chunk exceeds archive entry")
        if fourcc == b"ANMF":
            if chunk_size < 16:
                raise ValueError("Animated WebP frame chunk is truncated")
            duration_ms = int.from_bytes(data[payload_start + 12 : payload_start + 15], "little")
            if duration_ms <= 0:
                raise ValueError("Animated WebP has a zero-duration frame")
            total_ms += duration_ms
            frame_count += 1
        offset = payload_end + (chunk_size & 1)

    if frame_count < FRAME_COUNT or total_ms <= 0:
        raise ValueError(f"Expected an animated WebP with at least {FRAME_COUNT} timed frames")
    return total_ms, frame_count


def make_gif(webp_bytes: bytes, target: Path) -> None:
    source = Image.open(io.BytesIO(webp_bytes))
    count = int(getattr(source, "n_frames", 1))
    source_duration_ms, encoded_count = animated_webp_duration_ms(webp_bytes)
    if count != encoded_count:
        raise ValueError(
            f"WebP frame count mismatch: decoder={count}, ANMF chunks={encoded_count}"
        )
    indices = sampled_indices(count)

    # GIF stores delays in 10 ms ticks. 30 sampled poses preserve more of the source motion.
    duration_ms = max(20, round(source_duration_ms / FRAME_COUNT * SLOWDOWN_FACTOR / 10) * 10)

    frames_rgba: list[Image.Image] = []
    for index in indices:
        source.seek(index)
        frame = source.convert("RGBA").resize(SIZE, Image.Resampling.LANCZOS)
        frames_rgba.append(frame.copy())

    # Build one shared palette for all selected poses. Reserve palette index 255
    # for transparency so the illustration can sit on either light or dark UI.
    palette_source = Image.new("RGB", (SIZE[0], SIZE[1] * FRAME_COUNT))
    for i, frame in enumerate(frames_rgba):
        palette_source.paste(frame.convert("RGB"), (0, i * SIZE[1]))

    master_palette = palette_source.quantize(
        colors=255,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    palette = master_palette.getpalette()
    if palette is None:
        raise ValueError("Could not build an animation palette")
    palette = palette[:768] + [0] * max(0, 768 - len(palette))
    palette[255 * 3 : 255 * 3 + 3] = [0, 0, 0]

    frames_p: list[Image.Image] = []
    for frame in frames_rgba:
        quantized = frame.convert("RGB").quantize(
            palette=master_palette,
            dither=Image.Dither.NONE,
        )
        pixels = list(quantized.getdata())
        alpha = list(frame.getchannel("A").getdata())
        pixels = [255 if a < 128 else px for px, a in zip(pixels, alpha)]
        quantized.putdata(pixels)
        quantized.putpalette(palette)
        quantized.info["transparency"] = 255
        frames_p.append(quantized)

    target.parent.mkdir(parents=True, exist_ok=True)
    frames_p[0].save(
        target,
        format="GIF",
        save_all=True,
        append_images=frames_p[1:],
        duration=duration_ms,
        loop=0,
        disposal=2,
        transparency=255,
        optimize=True,
    )

    check = Image.open(target)
    if check.n_frames != FRAME_COUNT:
        raise ValueError(f"{target}: expected {FRAME_COUNT} frames, got {check.n_frames}")
    if check.info.get("transparency") is None:
        raise ValueError(f"{target}: transparent background did not survive GIF conversion")
    alpha_min, _ = check.convert("RGBA").getchannel("A").getextrema()
    if alpha_min != 0:
        raise ValueError(f"{target}: output has no transparent pixels")
    output_duration_ms = 0
    for i in range(check.n_frames):
        check.seek(i)
        output_duration_ms += int(check.info.get("duration", 0) or 0)
    target_duration_ms = round(source_duration_ms * SLOWDOWN_FACTOR)
    allowed_drift_ms = max(120, round(target_duration_ms * 0.08))
    if abs(output_duration_ms - target_duration_ms) > allowed_drift_ms:
        raise ValueError(
            f"{target}: animation duration drifted from slowed target {target_duration_ms} ms "
            f"to {output_duration_ms} ms (source {source_duration_ms} ms)"
        )


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: prepare-premium-exercise-pilot.py PREVIEW_ZIP OUTPUT_DIR")

    archive_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    required = [
        f"{prefix}images/animations/{motion}.webp"
        for prefix in VARIANTS.values()
        for motion in MOTIONS
    ]

    with zipfile.ZipFile(archive_path) as archive:
        available = set(archive.namelist())
        missing = [name for name in required if name not in available]
        if missing:
            raise SystemExit("RepDB preview is missing required pilot files:\n" + "\n".join(missing))

        for sex, prefix in VARIANTS.items():
            for motion in MOTIONS:
                source_name = f"{prefix}images/animations/{motion}.webp"
                target = output_dir / sex / f"{motion}.gif"
                make_gif(archive.read(source_name), target)
                print(f"Prepared {sex}/{motion}.gif ({target.stat().st_size} bytes, {FRAME_COUNT} frames; loop +{(SLOWDOWN_FACTOR - 1) * 100:.0f}% slower than source)")

    print(f"Prepared {len(VARIANTS) * len(MOTIONS)} offline pilot animations at {output_dir}")


if __name__ == "__main__":
    main()
