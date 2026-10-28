import { barcodeEquals, normalizeBarcode } from './ownFoods';

describe('ownFoods barcode matching', () => {
  it('точное совпадение кода', () => {
    expect(barcodeEquals('4601234567890', '4601234567890')).toBe(true);
    expect(barcodeEquals('4601234567890', '4601234567891')).toBe(false);
  });

  it('игнорирует не-цифровые символы при сравнении', () => {
    expect(barcodeEquals('460 1234 5678 90', '4601234567890')).toBe(true);
    expect(barcodeEquals('460-123-456', '460123456')).toBe(true);
    expect(normalizeBarcode('код: 46 01 23')).toBe('460123');
  });

  it('непривязанный штрихкод не матчится никогда', () => {
    expect(barcodeEquals(undefined, '4601234567890')).toBe(false);
    expect(barcodeEquals('', '4601234567890')).toBe(false);
  });

  it('пустой скан не матчится', () => {
    expect(barcodeEquals('4601234567890', '')).toBe(false);
  });
});
