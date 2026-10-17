import { BusyGuard } from './sessionActionGuard';

describe('BusyGuard (issue #167: защита от двойного тапа)', () => {
  test('tryAcquire/release: повторный захват подавляется, после release доступен снова', () => {
    const guard = new BusyGuard();
    expect(guard.isBusy()).toBe(false);
    expect(guard.tryAcquire()).toBe(true);
    expect(guard.isBusy()).toBe(true);
    expect(guard.tryAcquire()).toBe(false);
    guard.release();
    expect(guard.isBusy()).toBe(false);
    expect(guard.tryAcquire()).toBe(true);
  });

  test('run: конкурентный второй вызов не выполняет fn и возвращает undefined', async () => {
    const guard = new BusyGuard();
    const calls: number[] = [];
    const first = guard.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      calls.push(1);
      return 'first';
    });
    const second = await guard.run(async () => {
      calls.push(2);
      return 'second';
    });
    expect(second).toBeUndefined();
    expect(await first).toBe('first');
    expect(calls).toEqual([1]);
    // guard свободен после завершения
    expect(guard.isBusy()).toBe(false);
  });

  test('run: sync-результат возвращается и освобождает guard', async () => {
    const guard = new BusyGuard();
    expect(await guard.run(() => 42)).toBe(42);
    expect(guard.isBusy()).toBe(false);
    expect(await guard.run(() => 'next')).toBe('next');
  });

  test('run: guard освобождается даже при ошибке fn', async () => {
    const guard = new BusyGuard();
    await expect(
      guard.run(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(guard.isBusy()).toBe(false);
    expect(guard.tryAcquire()).toBe(true);
  });
});
