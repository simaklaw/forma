# FitPulse original 2D exercise pilot

This pipeline converts the approved, transparent PNG frame sequences exported by FitPulse Animation Studio into compact looping GIFs for the mobile prototype. It does not import RepDB preview footage and does not treat third-party preview clips as original artwork.

## Export

Install Pillow in the active Python environment, then run:

```bash
python scripts/convert_exercise_frames.py /path/to/frames_pull_up apps/mobile/assets/exercises/pull-up-male.gif --size 384 --fps 12 --stride 4 --report /tmp/pull-up-male.json
```

Use a separate output for the female variant. Input frames must be numbered PNG files with transparency. The converter keeps the full figure/equipment inside the square rather than cropping limbs. Defaults sample every fourth frame and include the final frame, targeting roughly 37 frames from a 147-frame render.

## Tests

```bash
python -m unittest discover -s scripts/tests -v
```

The tests cover numeric ordering, rejecting opaque frames, transparent looping GIF output, dimensions, and too-short sequences. The output still requires visual review for correct joints, grip, contact points, motion continuity and frame rate on a real Android device.
