jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///mock-cache/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  moveAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn()
}));
jest.mock('./exerciseMedia', () => ({ EXERCISE_VIDEOS: { pushup: 42 } }));
jest.mock('./exerciseVideoManifest.generated', () => ({
  EXERCISE_VIDEO_MANIFEST: [{ id: 'lib-video', videoUrl: 'https://cdn.example/video.mp4' }]
}));
jest.mock('./exerciseGifManifest.generated', () => ({
  EXERCISE_GIF_MANIFEST: [],
  gifEntryForLibraryId: jest.fn(),
  resolveGifUri: jest.fn(),
  resolveThumbUri: jest.fn(),
}));
jest.mock('./exerciseDatasetAssets.generated', () => ({
  DATASET_GIF_MODULES: {},
  DATASET_THUMB_MODULES: {},
}));

import * as FileSystem from 'expo-file-system';
import { ExerciseMediaService } from './ExerciseMediaService';

const dir = 'file:///mock-cache/exercise_media/';
const files = new Map<string, { size: number; modificationTime: number; content?: string }>();
const put = (name: string, size: number, modificationTime = 1) =>
  files.set(`${dir}${name}`, { size, modificationTime });

beforeEach(() => {
  jest.resetAllMocks();
  files.clear();
  (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
  (FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (path) => {
    const file = files.get(path);
    return file ? { exists: true, isDirectory: false, ...file } : { exists: false };
  });
  (FileSystem.readDirectoryAsync as jest.Mock).mockImplementation(async () =>
    [...files.keys()].map((p) => p.slice(dir.length))
  );
  (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation(async (path, content) => {
    files.set(path, { size: content.length, modificationTime: Date.now() / 1000, content });
  });
  (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(async (path) => {
    const file = files.get(path);
    if (!file) throw new Error('missing');
    return file.content;
  });
  (FileSystem.deleteAsync as jest.Mock).mockImplementation(async (path) => {
    for (const key of files.keys())
      if (key === path || key.startsWith(`${path}/`)) files.delete(key);
    if (path === dir) files.clear();
  });
  (FileSystem.moveAsync as jest.Mock).mockImplementation(async ({ from, to }) => {
    files.set(to, files.get(from)!);
    files.delete(from);
  });
  (FileSystem.downloadAsync as jest.Mock).mockImplementation(async (_url, path) => {
    files.set(path, { size: 100, modificationTime: 3 });
    return { status: 200, uri: path };
  });
});

afterEach(async () => {
  await ExerciseMediaService.getCacheSizeBytes(); // Drain background work before resetting mocks.
});

describe('ExerciseMediaService', () => {
  it('prefers bundled assets without filesystem access', async () => {
    expect(await ExerciseMediaService.getPlaybackSource('lib-video', 'pushup')).toBe(42);
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
  });

  it('uses a complete disk file and persists its last access', async () => {
    put('lib-local.mp4', 100);
    expect(await ExerciseMediaService.getPlaybackSource('lib-local')).toEqual({
      uri: `${dir}lib-local.mp4`
    });
    expect(files.has(`${dir}lib-local.mp4.access`)).toBe(true);
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('returns null when no source exists', async () => {
    expect(await ExerciseMediaService.getPlaybackSource('lib-unknown')).toBeNull();
  });

  it('streams and atomically caches a successful remote download', async () => {
    expect(await ExerciseMediaService.getPlaybackSource('lib-video')).toEqual({
      uri: 'https://cdn.example/video.mp4'
    });
    expect(await ExerciseMediaService.getCacheSizeBytes()).toBe(100);
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      'https://cdn.example/video.mp4',
      `${dir}lib-video.mp4.part`
    );
    expect(await ExerciseMediaService.getPlaybackSource('lib-video')).toEqual({
      uri: `${dir}lib-video.mp4`
    });
    expect(files.has(`${dir}lib-video.mp4.part`)).toBe(false);
  });

  it('streams and caches different gendered clips under separate offline cache keys', async () => {
    const maleUrl = 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/male/pull_up.mp4';
    const femaleUrl = 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/female/pull_up.mp4';

    expect(await ExerciseMediaService.getGenderedPlaybackSource('pullup', 'male')).toEqual({
      uri: maleUrl
    });
    expect(await ExerciseMediaService.getGenderedPlaybackSource('pullup', 'female')).toEqual({
      uri: femaleUrl
    });
    await ExerciseMediaService.getCacheSizeBytes(); // Drain both queued downloads.
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      maleUrl,
      `${dir}gendered-pullup-male.mp4.part`
    );
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      femaleUrl,
      `${dir}gendered-pullup-female.mp4.part`
    );

    expect(await ExerciseMediaService.getGenderedPlaybackSource('pullup', 'male')).toEqual({
      uri: `${dir}gendered-pullup-male.mp4`
    });
    expect(await ExerciseMediaService.getGenderedPlaybackSource('pullup', 'female')).toEqual({
      uri: `${dir}gendered-pullup-female.mp4`
    });
  });

  it('falls back to remote playback if filesystem access fails', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));
    expect(await ExerciseMediaService.getPlaybackSource('lib-video')).toEqual({
      uri: 'https://cdn.example/video.mp4'
    });
  });

  it.each([404, 500])('discards HTTP %s response files', async (status) => {
    (FileSystem.downloadAsync as jest.Mock).mockImplementation(async (_url, path) => {
      files.set(path, { size: 100, modificationTime: 3 });
      return { status };
    });
    await ExerciseMediaService.getPlaybackSource('lib-video');
    expect(await ExerciseMediaService.getCacheSizeBytes()).toBe(0);
    expect(files.size).toBe(0);
  });

  it('does not play partial files or duplicate an in-flight download, and clears after it', async () => {
    let finish!: () => void;
    (FileSystem.downloadAsync as jest.Mock).mockImplementation(async (_url, path) => {
      files.set(path, { size: 100, modificationTime: 3 });
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { status: 200 };
    });
    await ExerciseMediaService.getPlaybackSource('lib-video');
    expect(await ExerciseMediaService.getPlaybackSource('lib-video')).toEqual({
      uri: 'https://cdn.example/video.mp4'
    });
    expect(FileSystem.downloadAsync).toHaveBeenCalledTimes(1);
    const clearing = ExerciseMediaService.clearCache();
    finish();
    await clearing;
    expect(files.size).toBe(0);
  });

  it('evicts the least recently viewed clip, even when it was downloaded more recently', async () => {
    put('old-but-viewed.mp4', 700 * 1024 * 1024, 1);
    put('new-but-unviewed.mp4', 400 * 1024 * 1024, 2);
    await ExerciseMediaService.getPlaybackSource('old-but-viewed');
    await ExerciseMediaService.getPlaybackSource('lib-video');
    expect(await ExerciseMediaService.getCacheSizeBytes()).toBe(700 * 1024 * 1024 + 100);
    expect(files.has(`${dir}old-but-viewed.mp4`)).toBe(true);
    expect(files.has(`${dir}new-but-unviewed.mp4`)).toBe(false);
  });

  it('rejects oversized and empty downloads', async () => {
    for (const size of [0, 1024 * 1024 * 1024 + 1]) {
      (FileSystem.downloadAsync as jest.Mock).mockImplementation(async (_url, path) => {
        files.set(path, { size, modificationTime: 3 });
        return { status: 200 };
      });
      await ExerciseMediaService.getPlaybackSource('lib-video');
      expect(await ExerciseMediaService.getCacheSizeBytes()).toBe(0);
    }
  });
});
