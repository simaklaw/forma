import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectMp4Files, main } from './import-exercise-videos.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forma-video-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const videos = path.join(root, 'videos');
  fs.mkdirSync(videos);
  return { root, videos, outputFile: path.join(root, 'manifest.ts') };
}

test('real catalog matches nested uppercase filenames and encodes URL paths', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.videos, 'folder #1'));
  fs.writeFileSync(path.join(f.videos, 'folder #1', '3_4_Sit_Up.MP4'), 'synthetic-video');
  fs.symlinkSync(f.videos, path.join(f.videos, 'cycle'));
  const manifest = main({
    sourceDir: f.videos,
    outputFile: f.outputFile,
    rawBase: 'https://cdn.example/videos'
  });
  assert.deepEqual(
    manifest.map((e) => e.id),
    ['lib-3-4-sit-up']
  );
  assert.equal(manifest[0].videoUrl, 'https://cdn.example/videos/folder%20%231/3_4_Sit_Up.MP4');
  assert.match(fs.readFileSync(f.outputFile, 'utf8'), /lib-3-4-sit-up/);
  assert.equal([...collectMp4Files(f.videos).values()].flat().length, 1);
});

test('missing base, missing directory and no matches preserve the existing manifest', (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.outputFile, 'existing');
  const opts = { sourceDir: f.videos, outputFile: f.outputFile, rawBase: '' };
  assert.throws(() => main(opts), /EXERCISE_VIDEO_RAW_BASE/);
  assert.throws(
    () => main({ ...opts, sourceDir: path.join(f.root, 'missing') }),
    /existing directory/
  );
  assert.throws(() => main({ ...opts, rawBase: 'https://cdn.example/' }), /No matching/);
  assert.equal(fs.readFileSync(f.outputFile, 'utf8'), 'existing');
});

test('ambiguous duplicate basenames fail instead of assigning an arbitrary clip', (t) => {
  const f = fixture(t);
  for (const dir of ['a', 'b']) {
    fs.mkdirSync(path.join(f.videos, dir));
    fs.writeFileSync(path.join(f.videos, dir, '3-4-sit-up.mp4'), 'synthetic');
  }
  assert.throws(
    () => main({ sourceDir: f.videos, outputFile: f.outputFile, rawBase: 'https://cdn.example/' }),
    /Ambiguous/
  );
  assert.equal(fs.existsSync(f.outputFile), false);
});
