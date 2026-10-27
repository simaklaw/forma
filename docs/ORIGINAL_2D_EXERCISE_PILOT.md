# FitPulse original 2D exercise pilot

This pipeline converts the approved, transparent PNG frame sequences exported by FitPulse Animation Studio into compact looping GIFs for the mobile prototype. It does not import RepDB preview footage and does not treat third-party preview clips as original artwork.

## Export

Install Pillow in the active Python environment, then run:

```bash
python scripts/convert_exercise_frames.py /path/to/frames_pull_up apps/mobile/assets/exercises/pull-up-male.gif --size 384 --fps 24 --stride 1 --report /tmp/pull-up-male.json
```

Use a separate output for the female variant. Input frames must be numbered PNG files with transparency. The converter keeps the full figure/equipment inside the square rather than cropping limbs. Defaults retain every rendered frame and export at 24 fps for smooth movement with slightly slower playback than a 30 fps source. The final frame is retained when a custom stride is requested; increasing stride without lowering FPS shortens the cycle and can make it look unnaturally fast.

## Tests

```bash
python -m unittest discover -s scripts/tests -v
```

The tests cover numeric ordering, rejecting opaque frames, transparent looping GIF output, dimensions, and too-short sequences. The output still requires visual review for correct joints, grip, contact points, motion continuity and frame rate on a real Android device.
