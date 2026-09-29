import {
  startOutboxDrainLifecycle,
  resetOutboxDrainBootstrapForTests,
  runOutboxDrainOnce,
} from './bootstrapOutboxDrain';

describe('bootstrapOutboxDrain', () => {
  beforeEach(() => {
    resetOutboxDrainBootstrapForTests();
  });

  afterEach(() => {
    resetOutboxDrainBootstrapForTests();
  });

  it('startOutboxDrainLifecycle is idempotent and returns cleanup', () => {
    const stop1 = startOutboxDrainLifecycle();
    const stop2 = startOutboxDrainLifecycle();
    expect(typeof stop1).toBe('function');
    expect(typeof stop2).toBe('function');
    stop1();
    stop2();
  });

  it('runOutboxDrainOnce does not throw without API URL', async () => {
    await expect(runOutboxDrainOnce(5)).resolves.toBeUndefined();
  });
});
