/**
 * WgerExerciseService.ts
 *
 * Port of the report's module, now partially wired in (see
 * fetchExercisesByCategory's original doc comment for the still-open part
 * of the decision). What changed in this pass: `searchExerciseImage()` is a
 * new method that powers a narrow, low-risk slice of the report's "Local-
 * First Sync" model — background image enrichment for the local exercise
 * catalog (see useExerciseReference.ts) — WITHOUT switching the catalog's
 * source of truth to wger. That's still the open product decision described
 * below; this only adds a reference photo next to exercises the local JSON
 * catalog already defines.
 *
 * IMPORTANT — unverified against the live API: wger.de is not in this
 * sandbox's network allowlist, so `searchExerciseImage()` could not be
 * exercised against the real endpoint here. The request/response shape is
 * written from wger's public `/exercise/search/` documentation referenced
 * in the architecture report's sources, defensively parsed (any unexpected
 * shape falls through to `null`, same fail-open pattern as
 * fetchExercisesByCategory below), but test it against a real token/device
 * before shipping — see HANDOFF.md.
 *
 * Requires a wger API token for anything beyond the public read-only
 * category browse — see https://wger.de/en/user/api-key for generating one.
 * Store it via app config / EAS secrets, never hardcoded. Search is public
 * and works without a token; a token is only needed for write endpoints
 * (logging workouts to a wger account), which this service does not do.
 */

export interface WgerMuscle {
  id: number;
  name: string;
  is_front: boolean;
}

export interface WgerEquipment {
  id: number;
  name: string;
}

export interface WgerExercise {
  id: number;
  name: string;
  category: { id: number; name: string };
  description: string;
  muscles: WgerMuscle[];
  equipment: WgerEquipment[];
  images: string[];
}

export interface WgerExerciseReference {
  id: number;
  name: string;
  imageUrl: string;
}

export class WgerExerciseService {
  private static readonly BASE_URL = 'https://wger.de/api/v2';
  private static readonly MEDIA_ORIGIN = 'https://wger.de';
  private static cache = new Map<string, WgerExercise[]>();
  private static imageCache = new Map<string, WgerExerciseReference | null>();

  public static async fetchExercisesByCategory(categoryId: number, language = 2, apiToken?: string): Promise<WgerExercise[]> {
    const cacheKey = `exercise_cat_${categoryId}_${language}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const url = `${this.BASE_URL}/exerciseinfo/?category=${categoryId}&language=${language}&status=2&limit=100`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Token ${apiToken}` } : {})
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const results: any[] = data.results || [];
      const normalized: WgerExercise[] = results.map((item) => ({
        id: item.id,
        name: item.name ?? '',
        category: item.category,
        description: item.description ? String(item.description).replace(/<[^>]*>?/gm, '') : '',
        muscles: item.muscles ?? [],
        equipment: item.equipment ?? [],
        images: item.images ? item.images.map((img: any) => img.image) : []
      }));

      this.cache.set(cacheKey, normalized);
      return normalized;
    } catch (error) {
      console.error('WgerExerciseService: failed to load exercises', error);
      return [];
    }
  }

  /**
   * Best-effort lookup of a single reference photo for a local catalog
   * exercise, by free-text name (e.g. "Barbell Squat"). Returns null on any
   * network failure, empty result, or unrecognized response shape — callers
   * (useExerciseReference) treat null as "no photo available" and fall back
   * to showing nothing, never a broken image. In-memory only cache (per
   * process lifetime); the AsyncStorage-backed cross-session cache lives in
   * useExerciseReference.ts, one layer up, matching the report's SWR split
   * (fast local first, slower revalidation second).
   */
  public static async searchExerciseImage(term: string, language = 'en', apiToken?: string): Promise<WgerExerciseReference | null> {
    const cacheKey = `${term.toLowerCase()}_${language}`;
    if (this.imageCache.has(cacheKey)) return this.imageCache.get(cacheKey)!;

    const url = `${this.BASE_URL}/exercise/search/?term=${encodeURIComponent(term)}&language=${language}&format=json`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Token ${apiToken}` } : {})
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const suggestions: any[] = Array.isArray(data?.suggestions) ? data.suggestions : [];

      let result: WgerExerciseReference | null = null;
      for (const suggestion of suggestions) {
        const item = suggestion?.data;
        const rawImage = item?.image ?? item?.image_thumbnail;
        if (item && typeof item.id === 'number' && typeof rawImage === 'string' && rawImage.length > 0) {
          const imageUrl = rawImage.startsWith('http') ? rawImage : `${this.MEDIA_ORIGIN}${rawImage}`;
          result = { id: item.id, name: String(item.name ?? term), imageUrl };
          break;
        }
      }

      this.imageCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('WgerExerciseService: image search failed for', term, error);
      this.imageCache.set(cacheKey, null);
      return null;
    }
  }
}
