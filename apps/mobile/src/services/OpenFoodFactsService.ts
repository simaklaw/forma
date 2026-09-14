/**
 * OpenFoodFactsService.ts
 *
 * This is a genuine capability upgrade over the HTML prototype. In a browser,
 * fetch() refuses to let a script set the "User-Agent" header — it's on the
 * WHATWG forbidden-header list — so the web version's search silently went
 * out anonymously and Open Food Facts could rate-limit it harder as a result.
 * React Native's fetch (backed by native networking, not a browser sandbox)
 * has no such restriction: the header below actually gets sent, which is
 * exactly what Open Food Facts' usage policy asks every client to do.
 *
 * Still respects their stated limits: max ~15 req/min per IP, so callers
 * should debounce input (400ms, same as the HTML version) before calling
 * searchProducts.
 */

export interface Nutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
}

export interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: Nutriments;
  nutriscore_grade?: string;
}

export interface OFFProductResponse {
  code: string;
  status: number;
  product?: OFFProduct;
}

export interface NormalizedFood {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export class OpenFoodFactsService {
  private static readonly BASE_URL = 'https://world.openfoodfacts.org/api/v2';
  // Update the contact email before shipping — OFF asks for a real one so
  // they can reach out if a client misbehaves, per their API usage policy.
  private static readonly USER_AGENT = 'FitPulseApp/0.1 (support@fitpulse.app)';
  private static cache = new Map<string, OFFProductResponse>();
  private static searchCache = new Map<string, NormalizedFood[]>();

  private static normalize(p: OFFProduct): NormalizedFood | null {
    if (!p.product_name || !p.nutriments || p.nutriments['energy-kcal_100g'] == null) return null;
    return {
      name: p.brands ? `${p.product_name} (${p.brands.split(',')[0]})` : p.product_name,
      kcal: Math.round(p.nutriments['energy-kcal_100g'] || 0),
      protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
      fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
      carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10
    };
  }

  public static async getProductByBarcode(barcode: string): Promise<OFFProductResponse | null> {
    if (this.cache.has(barcode)) return this.cache.get(barcode)!;

    const fields = 'code,product_name,brands,nutriments,nutriscore_grade';
    const url = `${this.BASE_URL}/product/${barcode}.json?fields=${fields}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': this.USER_AGENT, Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: OFFProductResponse = await response.json();
      if (data.status === 1) {
        this.cache.set(barcode, data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('OpenFoodFactsService: barcode lookup failed', error);
      return null;
    }
  }

  public static async searchProducts(query: string, pageSize = 8): Promise<NormalizedFood[]> {
    const key = `${query.toLowerCase()}::${pageSize}`;
    if (this.searchCache.has(key)) return this.searchCache.get(key)!;

    const encoded = encodeURIComponent(query);
    // The classic /cgi/search.pl endpoint does free-text search reliably;
    // /api/v2/search wants structured tag filters (categories_tags_en etc.),
    // which doesn't fit a plain search box well.
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${pageSize}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': this.USER_AGENT, Accept: 'application/json' }
      });
      if (!response.ok) return [];
      const data = await response.json();
      const normalized = ((data.products || []) as OFFProduct[])
        .map((p) => this.normalize(p))
        .filter((f): f is NormalizedFood => f !== null)
        .slice(0, pageSize);
      this.searchCache.set(key, normalized);
      return normalized;
    } catch (error) {
      console.error('OpenFoodFactsService: search failed', error);
      return [];
    }
  }
}
