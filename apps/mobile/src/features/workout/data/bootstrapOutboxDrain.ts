import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { createLogger } from '@/core/logger';
import { OutboxDrainService } from './OutboxDrainService';
import {
  createHttpOutboxTransportFromEnv,
  noopOutboxTransport,
} from './index';

const log = createLogger('outbox-bootstrap');

let started = false;
let appStateSub: NativeEventSubscription | null = null;
let drain: OutboxDrainService | null = null;

function getDrain(): OutboxDrainService {
  if (!drain) {
    const transport = createHttpOutboxTransportFromEnv() ?? noopOutboxTransport;
    drain = new OutboxDrainService(transport);
    if (!createHttpOutboxTransportFromEnv()) {
      log.debug('no EXPO_PUBLIC_SYNC_API_URL — using noop transport');
    }
  }
  return drain;
}

/** Run a single drain pass; never throws to the UI. */
export async function runOutboxDrainOnce(limit = 20): Promise<void> {
  try {
    const d = getDrain();
    const result = await d.drainOnce(limit);
    if (result.accepted + result.failed + result.skipped > 0) {
      log.info('outbox drain', result);
    }
  } catch (err) {
    log.warn('outbox drain failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Start lifecycle: drain on cold start, again when app becomes active.
 * Idempotent — safe to call once from App.tsx.
 */
export function startOutboxDrainLifecycle(): () => void {
  if (started) {
    return () => undefined;
  }
  started = true;

  void (async () => {
    await runOutboxDrainOnce(20);
    try {
      await getDrain().pruneAccepted(14);
    } catch {
      /* non-fatal */
    }
  })();

  const onChange = (next: AppStateStatus) => {
    if (next === 'active') {
      void runOutboxDrainOnce(20);
    }
  };
  appStateSub = AppState.addEventListener('change', onChange);

  return () => {
    appStateSub?.remove();
    appStateSub = null;
    started = false;
  };
}

/** Test helper — reset module state. */
export function resetOutboxDrainBootstrapForTests(): void {
  appStateSub?.remove();
  appStateSub = null;
  started = false;
  drain = null;
}
