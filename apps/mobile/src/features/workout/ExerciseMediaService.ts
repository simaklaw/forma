import * as FileSystem from 'expo-file-system';
import { EXERCISE_VIDEOS, type ExerciseMediaKey } from './exerciseMedia';
import { EXERCISE_VIDEO_MANIFEST } from './exerciseVideoManifest.generated';

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}exercise_media/`;
const MAX_CACHE_BYTES = 1024 * 1024 * 1024;

/** Bundled asset → complete cached file → remote playback with background caching. */
export class ExerciseMediaService {
  private static pending = new Map<string, Promise<void>>();
  // Serialize downloads, eviction and clearing so writes cannot restore a cleared cache.
  private static mutations: Promise<unknown> = Promise.resolve();

  private static enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.mutations.then(operation);
    this.mutations = next.catch(() => {});
    return next;
  }

  private static cacheFilePath(libraryId: string): string {
    return `${CACHE_DIR}${encodeURIComponent(libraryId)}.mp4`;
  }

  private static async ensureCacheDir(): Promise<void> {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }

  private static async touch(path: string): Promise<void> {
    // Persist access time across app restarts without rewriting the video itself.
    await FileSystem.writeAsStringAsync(`${path}.access`, String(Date.now()));
  }

  static async getPlaybackSource(
    libraryId: string,
    mediaKey?: ExerciseMediaKey
  ): Promise<{ uri: string } | number | null> {
    const bundled = mediaKey ? EXERCISE_VIDEOS[mediaKey] : undefined;
    if (bundled != null) return bundled;
    const remoteUrl = EXERCISE_VIDEO_MANIFEST.find((entry) => entry.id === libraryId)?.videoUrl;
    const remote = remoteUrl ? { uri: remoteUrl } : null;
    if (!FileSystem.cacheDirectory) return remote;

    const cachePath = this.cacheFilePath(libraryId);
    try {
      await this.ensureCacheDir();
      const info = await FileSystem.getInfoAsync(cachePath);
      if (info.exists && !info.isDirectory && info.size > 0) {
        await this.touch(cachePath).catch(() => {});
        return { uri: cachePath };
      }
    } catch {
      // Cache unavailability must not prevent streaming.
      return remote;
    }
    if (remoteUrl) this.downloadInBackground(remoteUrl, cachePath);
    return remote;
  }

  private static downloadInBackground(remoteUrl: string, targetPath: string): void {
    if (this.pending.has(targetPath)) return;
    const download = this.enqueue(async () => {
      const temporary = `${targetPath}.part`;
      try {
        await this.ensureCacheDir();
        const result = await FileSystem.downloadAsync(remoteUrl, temporary);
        if (result.status !== 200) return;
        const info = await FileSystem.getInfoAsync(temporary);
        if (!info.exists || info.isDirectory || info.size <= 0 || info.size > MAX_CACHE_BYTES)
          return;
        // Only expose the file after a successful, complete download.
        await FileSystem.moveAsync({ from: temporary, to: targetPath });
        await this.touch(targetPath).catch(() => {});
        await this.evictIfOverBudget();
      } catch {
        // Playback already uses the remote URL; a later request can retry caching.
      } finally {
        await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
      }
    });
    this.pending.set(targetPath, download);
    void download.finally(() => this.pending.delete(targetPath));
  }

  private static async entries(): Promise<{ path: string; size: number; accessed: number }[]> {
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const entries: { path: string; size: number; accessed: number }[] = [];
    for (const file of files) {
      if (!file.endsWith('.mp4')) continue;
      const path = `${CACHE_DIR}${file}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists || info.isDirectory) continue;
      let accessed = info.modificationTime * 1000;
      try {
        const saved = Number(await FileSystem.readAsStringAsync(`${path}.access`));
        if (Number.isFinite(saved) && saved > 0) accessed = saved;
      } catch {
        /* Older cache files may have no access marker. */
      }
      entries.push({ path, size: info.size, accessed });
    }
    return entries;
  }

  private static async evictIfOverBudget(): Promise<void> {
    const entries = await this.entries();
    let total = entries.reduce((sum, entry) => sum + entry.size, 0);
    entries.sort((a, b) => a.accessed - b.accessed);
    for (const entry of entries) {
      if (total <= MAX_CACHE_BYTES) break;
      try {
        await FileSystem.deleteAsync(entry.path, { idempotent: true });
        total -= entry.size;
        await FileSystem.deleteAsync(`${entry.path}.access`, { idempotent: true });
      } catch {
        /* Keep counting files whose deletion failed, and try the next. */
      }
    }
  }

  static async getCacheSizeBytes(): Promise<number> {
    if (!FileSystem.cacheDirectory) return 0;
    return this.enqueue(async () => {
      await this.ensureCacheDir();
      return (await this.entries()).reduce((sum, entry) => sum + entry.size, 0);
    });
  }

  static async clearCache(): Promise<void> {
    if (!FileSystem.cacheDirectory) return;
    return this.enqueue(async () => {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await this.ensureCacheDir();
    });
  }
}
