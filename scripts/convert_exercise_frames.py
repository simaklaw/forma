#!/usr/bin/env python3
"""Convert transparent FitPulse frame sequences into compact animated GIFs.

Input frame directories must contain numerically named PNG files. The converter
keeps alpha, samples the source sequence evenly, resizes to a fixed square canvas,
and writes a looping GIF. It does not validate the exercise's biomechanics.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageSequence

FRAME_RE = re.compile(r"(\d+)\.png$", re.IGNORECASE)
DEFAULT_SIZE = 384
DEFAULT_FPS = 12
DEFAULT_MAX_BYTES = 8 * 1024 * 1024


def ordered_frames(directory: Path) -> list[Path]:
    if not directory.is_dir():
        raise ValueError(f"Frame directory does not exist: {directory}")
    frames = []
    for path in directory.iterdir():
        match = FRAME_RE.fullmatch(path.name)
        if match and path.is_file():
            frames.append((int(match.group(1)), path))
    frames.sort(key=lambda item: item[0])
    if len(frames) < 8:
        raise ValueError(f"Expected at least 8 numbered PNG frames in {directory}; found {len(frames)}")
    numbers = [number for number, _ in frames]
    if len(numbers) != len(set(numbers)):
        raise ValueError(f"Duplicate frame numbers in {directory}")
    return [path for _, path in frames]


def prepare_frame(path: Path, size: int) -> Image.Image:
    with Image.open(path) as source:
        if source.format != "PNG":
            raise ValueError(f"Expected PNG frame: {path}")
        rgba = source.convert("RGBA")
        if rgba.getchannel("A").getextrema() == (255, 255):
            raise ValueError(f"Frame has no transparent pixels: {path}")
        # Fit within the square without cropping limbs or equipment.
        fitted = ImageOps.contain(rgba, (size, size), method=Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
        return canvas


def convert(input_dir: Path, output: Path, *, size: int = DEFAULT_SIZE,
            fps: int = DEFAULT_FPS, stride: int = 4,
            max_bytes: int = DEFAULT_MAX_BYTES) -> dict:
    if size < 64 or size > 1024:
        raise ValueError("size must be between 64 and 1024")
    if fps < 4 or fps > 30:
        raise ValueError("fps must be between 4 and 30")
    if stride < 1:
        raise ValueError("stride must be at least 1")
    paths = ordered_frames(input_dir)
    selected = paths[::stride]
    if selected[-1] != paths[-1]:
        selected.append(paths[-1])
    frames = [prepare_frame(path, size) for path in selected]
    if len({frame.tobytes() for frame in frames}) < 6:
        raise ValueError("Source sequence has fewer than six visually distinct sampled frames")

    # GIF transparency uses a palette index. Reserve palette entry 0 for alpha=0.
    palette_frames = []
    for frame in frames:
        alpha = frame.getchannel("A")
        rgb = Image.new("RGB", frame.size, (0, 0, 0))
        rgb.paste(frame.convert("RGB"), mask=alpha)
        pal = rgb.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        pal_data = list(pal.getpalette() or [])
        pal_data[:3] = [0, 0, 0]
        pal.putpalette(pal_data)
        # Make transparent pixels index 0 and shift visible palette indices by 1.
        indexed = Image.new("P", frame.size, 0)
        visible = alpha.point(lambda value: 255 if value >= 128 else 0)
        quantized = rgb.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        quantized_pixels = quantized.load()
        indexed_pixels = indexed.load()
        visible_pixels = visible.load()
        for y in range(size):
            for x in range(size):
                if visible_pixels[x, y]:
                    indexed_pixels[x, y] = min(quantized_pixels[x, y] + 1, 255)
        palette = [0, 0, 0] + (quantized.getpalette() or [])[:765]
        palette = palette[:768] + [0] * max(0, 768 - len(palette))
        indexed.putpalette(palette)
        indexed.info["transparency"] = 0
        palette_frames.append(indexed)

    output.parent.mkdir(parents=True, exist_ok=True)
    duration_ms = round(1000 / fps)
    palette_frames[0].save(
        output, save_all=True, append_images=palette_frames[1:],
        duration=duration_ms, loop=0, disposal=2, transparency=0,
        optimize=True,
    )
    size_bytes = output.stat().st_size
    report = {
        "inputDirectory": str(input_dir),
        "output": str(output),
        "sourceFrames": len(paths),
        "outputFrames": len(palette_frames),
        "width": size,
        "height": size,
        "fps": fps,
        "durationMs": duration_ms * len(palette_frames),
        "transparentBackground": True,
        "loop": 0,
        "sizeBytes": size_bytes,
        "maxBytes": max_bytes,
        "pass": size_bytes <= max_bytes,
        "limitation": "Technical export checks do not certify correct exercise technique or anatomy.",
    }
    if size_bytes > max_bytes:
        raise ValueError(f"Output is {size_bytes} bytes, exceeding budget {max_bytes}: {output}")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=int, default=DEFAULT_SIZE)
    parser.add_argument("--fps", type=int, default=DEFAULT_FPS)
    parser.add_argument("--stride", type=int, default=4)
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        report = convert(args.input_dir, args.output, size=args.size, fps=args.fps,
                         stride=args.stride, max_bytes=args.max_bytes)
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
