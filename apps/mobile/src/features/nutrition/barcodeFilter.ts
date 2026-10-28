/**
 * Контракт «продуктового» штрихкода — зеркало barcodeSchema API
 * (GET /api/v1/nutrition/product/:barcode: 8–14 цифр, EAN/UPC).
 * Ручной ввод в AddFoodSheet и результат сканера валидируются одинаково.
 */
export function isFoodBarcode(value: string): boolean {
  return /^[0-9]{8,14}$/.test(value.trim());
}

/** Типы expo-camera, которыми кодируется продуктовый код (EAN/UPC). */
export const FOOD_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;
