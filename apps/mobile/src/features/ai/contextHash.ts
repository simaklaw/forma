/**
 * Стабильная сериализация и хеш бизнес-контекста.
 * Пока контекст (дневник питания, тренировка) не изменился, повторный
 * AI-анализ не вызывается — экономия токенов пользователя (паттерн free-fitness).
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return '{' + keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',') + '}';
}

/** djb2 — короткий детерминированный хеш стабильной сериализации. */
export function contextHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}
