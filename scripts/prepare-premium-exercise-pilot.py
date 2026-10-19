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

from PIL import Image, ImageSequence

SIZE = (160, 160)
FRAME_COUNT = 5
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


def make_gif(webp_bytes: bytes, target: Path) -> None:
    source = Image.open(io.BytesIO(webp_bytes))
    count = int(getattr(source, "n_frames", 1))
    indices = sampled_indices(count)

    total_ms = 0
    for frame in ImageSequence.Iterator(source):
        total_ms += int(frame.info.get("duration", 100) or 100)
    duration_ms = max(100, min(240, round(total_ms / FRAME_COUNT)))

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
                print(f"Prepared {sex}/{motion}.gif ({target.stat().st_size} bytes, {FRAME_COUNT} frames)")

    print(f"Prepared {len(VARIANTS) * len(MOTIONS)} offline pilot animations at {output_dir}")


if __name__ == "__main__":
    main()
