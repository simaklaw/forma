/**
 * BusyGuard — защита async-действий от двойного тапа (issue #167).
 *
 * Булевый state в onPress неприменим: до ре-рендера замыкание видит
 * устаревшее значение, и два быстрых тапа оба проходят проверку.
 * Guard живёт в ref и захваты synchronously — второй вызов подавляется
 * гарантированно.
 */
export class BusyGuard {
  private busy = false;

  isBusy(): boolean {
    return this.busy;
  }

  /** true — захват удался; false — операция уже выполняется. */
  tryAcquire(): boolean {
    if (this.busy) return false;
    this.busy = true;
    return true;
  }

  release(): void {
    this.busy = false;
  }

  /**
   * Подавляет повторный вызов fn, пока предыдущий не завершился.
   * Возвращает результат fn либо undefined, если вызов подавлен.
   */
  async run<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
    if (!this.tryAcquire()) return undefined;
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
