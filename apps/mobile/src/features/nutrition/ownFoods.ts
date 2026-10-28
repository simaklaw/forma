/**
 * Матчинг своих продуктов и блюд по штрихкоду (сканер → мгновенный лог).
 * Чистая логика без RN/стора: нормализация кода и сравнение.
 */

/** Штрихкод сравнивается по цифрам: пробелы/тире при вводе не мешают. */
export function normalizeBarcode(value: string): string {
  return value.replace(/\D/g, '');
}

/** Совпадает ли привязанный штрихкод с отсканированным кодом. */
export function barcodeEquals(attached: string | undefined, scanned: string): boolean {
  if (attached == null || attached.length === 0) return false;
  return normalizeBarcode(attached) === normalizeBarcode(scanned);
}
