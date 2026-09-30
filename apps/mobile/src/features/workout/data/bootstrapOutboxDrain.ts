import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/core/logger';
import type { SessionProjection } from './sessionProjections';
import { OutboxDrainService, noopOutboxTransport } from './OutboxDrainService';
import { createHttpOutboxTransport } from './HttpOutboxTransport';
import { ensureSyncCredentials } from '../../auth/syncAuth';
import { SyncPullService } from '../../sync/syncPullService';

const log = createLogger('outbox-bootstrap');

let started = false;
let appStateSub: NativeEventSubscription | null = null;
let drainPromise: Promise<OutboxDrainService> | null = null;
let hasHttpTransport = false;
let pullService: SyncPullService | null = null;

function syncApiUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SYNC_API_URL) {
    return process.env.EXPO_PUBLIC_SYNC_API_URL;
  }
  return '';
}

/**
 * Build the drain once per app session:
 * 1. no EXPO_PUBLIC_SYNC_API_URL -> noop transport (fully offline);
 * 2. URL set -> ensure per-user JWT credentials (register on first use,
 *    re-register on expiry) and wire them into the HTTP transport.
 * Credential failure is non-fatal: noop transport for this session,
 * next app start retries registration.
 */
async function buildDrain(): Promise<OutboxDrainService> {
  const base = syncApiUrl();
  if (!base) {
    log.debug('no EXPO_PUBLIC_SYNC_API_URL - using noop transport');
    return new OutboxDrainService(noopOutboxTransport);
  }

  const creds = await ensureSyncCredentials({
    baseUrl: base,
    storage: AsyncStorage,
  });
  if (!creds) {
    log.warn('no sync credentials - noop transport this session');
    return new OutboxDrainService(noopOutboxTransport);
  }

  hasHttpTransport = true;
  return new OutboxDrainService(
    createHttpOutboxTransport({
      baseUrl: base,
      token: creds.token,
      userId: creds.user_id,
    }),
  );
}

/** Lazily built, cached drain; on build failure allow a retry next pass. */
function getDrain(): Promise<OutboxDrainService> {
  if (!drainPromise) {
    drainPromise = buildDrain().catch((err: unknown) => {
      drainPromise = null;
      throw err;
    });
  }
  return drainPromise;
}

/**
 * Lazily build the pull service. Returns null when fully offline
 * (no EXPO_PUBLIC_SYNC_API_URL). Applier deps are dynamic imports so
 * node-env unit tests never load the Zustand store chain.
 */
async function getPullService(): Promise<SyncPullService | null> {
  if (pullService) {
    return pullService;
  }
  const base = syncApiUrl();
  if (!base) {
    return null;
  }
  const { createWorkoutSessionChangeApplier } = await import('../../sync/workoutSessionChangeApplier');
  const { applySessionProjection } = await import('../applySessionProjection');
  pullService = new SyncPullService({
    baseUrl: base,
    storage: AsyncStorage,
    applier: createWorkoutSessionChangeApplier((next) => applySessionProjection(next as SessionProjection)),
  });
  return pullService;
}

/** Run a single drain pass; never throws to the UI. */
export async function runOutboxDrainOnce(limit = 20): Promise<void> {
  try {
    const d = await getDrain();
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
 * One full sync pass: push outbox, then pull remote changes and
 * apply them to the local read model. Never throws to the UI.
 */
export async function runSyncOnce(limit = 20): Promise<void> {
  await runOutboxDrainOnce(limit);
  try {
    const pull = await getPullService();
    if (!pull) {
      return;
    }
    const result = await pull.pullOnce();
    if (!result.offline && result.applied + result.skipped > 0) {
      log.info('sync pull', result);
    }
  } catch (err) {
    log.warn('sync pull failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Start lifecycle: sync on cold start, again when app becomes active.
 * Idempotent - safe to call once from App.tsx.
 */
export function startOutboxDrainLifecycle(): () => void {
  if (started) {
    return () => undefined;
  }
  started = true;

  void (async () => {
    await runSyncOnce(20);
    try {
      const d = await getDrain();
      await d.pruneAccepted(14);
    } catch {
      /* non-fatal */
    }
  })();

  const onChange = (next: AppStateStatus) => {
    if (next === 'active') {
      void runSyncOnce(20);
    }
  };
  appStateSub = AppState.addEventListener('change', onChange);

  return () => {
    appStateSub?.remove();
    appStateSub = null;
    started = false;
  };
}

/** Test helper - reset module state. */
export function resetOutboxDrainBootstrapForTests(): void {
  appStateSub?.remove();
  appStateSub = null;
  started = false;
  drainPromise = null;
  hasHttpTransport = false;
  pullService = null;
}
