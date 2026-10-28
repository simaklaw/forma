import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { OpenFoodFactsService } from "./OpenFoodFactsService.ts";

/** Подменяем fetch заглушкой с готовым ответом OFF. */
function stubFetch(payload: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })) as typeof fetch;
}

const realFetch = globalThis.fetch;

describe("OpenFoodFactsService.normalize (микронутриенты)", () => {
  beforeEach(() => {
    OpenFoodFactsService.clearCaches();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("забирает fiber/sugars/saturatedFat и переводит натрий в мг", async () => {
    stubFetch({
      code: "4601234567890",
      status: 1,
      product: {
        product_name: "Овсяные хлопья",
        brands: "Nestle,Другой бренд",
        nutriments: {
          "energy-kcal_100g": 366,
          proteins_100g: 12.34,
          fat_100g: 7.26,
          carbohydrates_100g: 55.55,
          fiber_100g: 8.26,
          sugars_100g: 3.14,
          "saturated-fat_100g": 1.29,
          sodium_100g: 0.0037
        }
      }
    });

    const food = await OpenFoodFactsService.getNormalizedByBarcode("4601234567890");
    assert.equal(food?.name, "Овсяные хлопья (Nestle)");
    assert.equal(food?.kcal, 366);
    assert.equal(food?.protein, 12.3);
    assert.equal(food?.fiber, 8.3);
    assert.equal(food?.sugars, 3.1);
    assert.equal(food?.saturatedFat, 1.3);
    assert.equal(food?.sodiumMg, 4); // 0.0037 г → 3.7 мг → 4 мг
  });

  it("не добавляет поля микронутриентов, когда OFF их не отдал", async () => {
    stubFetch({
      code: "2001234567891",
      status: 1,
      product: {
        product_name: "Творог",
        nutriments: {
          "energy-kcal_100g": 98,
          proteins_100g: 17,
          fat_100g: 4,
          carbohydrates_100g: 3
        }
      }
    });

    const food = await OpenFoodFactsService.getNormalizedByBarcode("2001234567891");
    assert.equal(food?.kcal, 98);
    assert.equal(food?.fiber, undefined);
    assert.equal(food?.sodiumMg, undefined);
    assert.ok(food != null && !("fiber" in food));
  });

  it("возвращает null без ккал на 100 г", async () => {
    stubFetch({
      code: "3001234567892",
      status: 1,
      product: {
        product_name: "Пустой продукт",
        nutriments: { proteins_100g: 5 }
      }
    });

    const food = await OpenFoodFactsService.getNormalizedByBarcode("3001234567892");
    assert.equal(food, null);
  });
});
