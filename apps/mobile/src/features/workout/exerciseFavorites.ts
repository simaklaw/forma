import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingMode } from './catalog';

const FAV_KEY = 'fitpulse_catalog_favorites_v1';
const RECENT_KEY = 'fitpulse_catalog_recent_v1';
export const MAX_RECENT = 12;

export function favoriteKey(mode: TrainingMode, id: number): string {
  return `${mode}:${id}`;
}

export function parseFavoriteKey(key: string): { mode: TrainingMode; id: number } | null {
  const match = /^(gym|home):(\d+)$/.exec(key);
  if (!match) return null;
  return { mode: match[1] as TrainingMode, id: Number(match[2]) };
}

async function readKeys(storageKey: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

async function writeKeys(storageKey: string, keys: string[]): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(keys));
}

export async function loadFavorites(): Promise<string[]> {
  return readKeys(FAV_KEY);
}

export async function isFavorite(mode: TrainingMode, id: number): Promise<boolean> {
  const keys = await loadFavorites();
  return keys.includes(favoriteKey(mode, id));
}

/** Toggle favorite; returns whether the exercise is favorited after the call. */
export async function toggleFavorite(mode: TrainingMode, id: number): Promise<boolean> {
  const key = favoriteKey(mode, id);
  const keys = await loadFavorites();
  const idx = keys.indexOf(key);
  if (idx >= 0) {
    keys.splice(idx, 1);
    await writeKeys(FAV_KEY, keys);
    return false;
  }
  keys.unshift(key);
  await writeKeys(FAV_KEY, keys);
  return true;
}

export async function loadRecent(): Promise<string[]> {
  return readKeys(RECENT_KEY);
}

/** Move exercise to front of recent list (deduped, capped). */
export async function pushRecent(mode: TrainingMode, id: number): Promise<void> {
  const key = favoriteKey(mode, id);
  const keys = await loadRecent();
  const next = [key, ...keys.filter((item) => item !== key)].slice(0, MAX_RECENT);
  await writeKeys(RECENT_KEY, next);
}
