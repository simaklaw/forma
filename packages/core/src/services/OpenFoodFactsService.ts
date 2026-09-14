/**
 * OpenFoodFactsService — pure fetch client (no React / RN).
 * Debounce search input (~400ms) at the UI layer; respect ~15 req/min.
 */

export interface Nutriments {
  "energy-kcal_100g"?: number;
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
  private static readonly BASE_URL = "https://world.openfoodfacts.org/api/v2";
  private static readonly USER_AGENT = "FormaApp/0.1 (https://github.com/simaklaw/forma)";
  private static cache = new Map<string, OFFProductResponse>();
  private static searchCache = new Map<string, NormalizedFood[]>();

  private static normalize(p: OFFProduct): NormalizedFood | null {
    if (!p.product_name || !p.nutriments || p.nutriments["energy-kcal_100g"] == null) return null;
    return {
      name: p.brands ? `${p.product_name} (${p.brands.split(",")[0]})` : p.product_name,
      kcal: Math.round(p.nutriments["energy-kcal_100g"] || 0),
      protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
      fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
      carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
    };
  }

  public static async getProductByBarcode(barcode: string): Promise<OFFProductResponse | null> {
    if (this.cache.has(barcode)) return this.cache.get(barcode)!;

    const fields = "code,product_name,brands,nutriments,nutriscore_grade";
    const url = `${this.BASE_URL}/product/${barcode}.json?fields=${fields}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": this.USER_AGENT, Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: OFFProductResponse = await response.json();
      if (data.status === 1) {
        this.cache.set(barcode, data);
        return data;
      }
      return null;
    } catch (error) {
      console.error("OpenFoodFactsService: barcode lookup failed", error);
      return null;
    }
  }

  public static async searchProducts(query: string, pageSize = 8): Promise<NormalizedFood[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const key = `${trimmed.toLowerCase()}::${pageSize}`;
    if (this.searchCache.has(key)) return this.searchCache.get(key)!;

    const encoded = encodeURIComponent(trimmed);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${pageSize}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": this.USER_AGENT, Accept: "application/json" },
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
      console.error("OpenFoodFactsService: search failed", error);
      return [];
    }
  }

  /** Test helper — clears in-memory caches. */
  public static clearCaches(): void {
    this.cache.clear();
    this.searchCache.clear();
  }
}
