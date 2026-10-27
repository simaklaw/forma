import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

from convert_exercise_frames import convert, ordered_frames, prepare_frame


class ConvertExerciseFramesTests(unittest.TestCase):
    def make_frames(self, root: Path, count: int = 12) -> Path:
        folder = root / "frames"
        folder.mkdir()
        for i in range(count):
            image = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            draw.ellipse((10 + i, 20, 30 + i, 40), fill=(20, 130, 90, 255))
            image.save(folder / f"{i + 1:04d}.png")
        return folder

    def test_orders_numeric_frame_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            for name in ("0010.png", "0002.png", "0001.png"):
                Image.new("RGBA", (64, 64), (1, 2, 3, 0)).save(folder / name)
            self.assertEqual([p.name for p in ordered_frames(folder)],
                             ["0001.png", "0002.png", "0010.png"])

    def test_rejects_opaque_frame(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "opaque.png"
            Image.new("RGBA", (64, 64), (20, 30, 40, 255)).save(path)
            with self.assertRaisesRegex(ValueError, "no transparent pixels"):
                prepare_frame(path, 128)

    def test_exports_looping_transparent_gif_with_bounded_dimensions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = self.make_frames(root)
            output = root / "out" / "test.gif"
            report = convert(source, output, size=128, fps=12, stride=1, max_bytes=1_000_000)
            self.assertTrue(report["pass"])
            with Image.open(output) as gif:
                self.assertEqual(gif.size, (128, 128))
                self.assertEqual(gif.info.get("loop"), 0)
                self.assertIsNotNone(gif.info.get("transparency"))
                self.assertGreaterEqual(gif.n_frames, 6)

    def test_rejects_too_few_frames(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            for i in range(4):
                Image.new("RGBA", (64, 64), (0, 0, 0, 0)).save(folder / f"{i:04d}.png")
            with self.assertRaisesRegex(ValueError, "at least 8"):
                ordered_frames(folder)


if __name__ == "__main__":
    unittest.main()
