import { FOOD_BARCODE_TYPES, isFoodBarcode } from './barcodeFilter';

describe('isFoodBarcode', () => {
  it('пропускает продуктовые коды EAN/UPC (8–14 цифр)', () => {
    expect(isFoodBarcode('4601234567890')).toBe(true); // EAN-13
    expect(isFoodBarcode('01234565')).toBe(true); // EAN-8 / UPC-E
    expect(isFoodBarcode('123456789012')).toBe(true); // UPC-A (12 цифр)
    expect(isFoodBarcode('12345678901234')).toBe(true); // 14 цифр
  });

  it('тримит пробелы вокруг кода', () => {
    expect(isFoodBarcode('  4601234567890 ')).toBe(true);
  });

  it('отбрасывает не-продуктовые значения', () => {
    expect(isFoodBarcode('1234567')).toBe(false); // 7 цифр — короткий
    expect(isFoodBarcode('123456789012345')).toBe(false); // 15 цифр — длинный
    expect(isFoodBarcode('46012345678a')).toBe(false); // буквы
    expect(isFoodBarcode('https://world.openfoodfacts.org')).toBe(false); // QR-ссылка
    expect(isFoodBarcode('')).toBe(false);
  });
});

describe('FOOD_BARCODE_TYPES', () => {
  it('содержит только продуктовые форматы EAN/UPC', () => {
    expect(FOOD_BARCODE_TYPES).toEqual(['ean13', 'ean8', 'upc_a', 'upc_e']);
  });
});
