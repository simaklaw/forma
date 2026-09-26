import { createLogger } from '@/core/logger';
import type { OutboxRow, OutboxStatus } from './SessionRepository';
import { getSessionService } from './createSessionService';

const log = createLogger('outbox');

export type OutboxTransport = {
  /**
   * Push one outbox row to a remote API.
   * P1 skeleton: not implemented — inject a no-op or test double.
   */
  send(row: OutboxRow): Promise<'accepted' | 'failed'>;
};

/** Default transport: never hits the network; leaves rows pending. */
export const noopOutboxTransport: OutboxTransport = {
  async send() {
    return 'failed';
  }
};

/**
 * Local outbox drain — no cloud yet.
 * - listPending: inspect queue
 * - drainOnce: try transport for each pending row, mark accepted/failed
 *
 * Until a real transport is injected, drainOnce is a no-op path that marks nothing
 * as accepted (noop transport returns failed without mutating unless forceMark).
 */
export class OutboxDrainService {
  constructor(private readonly transport: OutboxTransport = noopOutboxTransport) {}

  async listPending(limit = 50): Promise<OutboxRow[]> {
    return getSessionService().listPendingOutbox(limit);
  }

  async mark(operationId: string, status: OutboxStatus): Promise<void> {
    await getSessionService().markOutbox(operationId, status);
  }

  /**
   * Process up to `limit` pending rows through transport.
   * Returns counts; does not throw on per-row transport failure.
   */
  async drainOnce(limit = 20): Promise<{ accepted: number; failed: number; skipped: number }> {
    const pending = await this.listPending(limit);
    let accepted = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of pending) {
      try {
        const result = await this.transport.send(row);
        if (result === 'accepted') {
          await this.mark(row.operationId, 'accepted');
          accepted += 1;
        } else {
          await this.mark(row.operationId, 'failed');
          failed += 1;
        }
      } catch (err) {
        skipped += 1;
        log.warn('transport threw; row skipped', {
          operationId: row.operationId,
          err: err instanceof Error ? err.message : String(err)
        });
      }
    }

    if (pending.length > 0) {
      log.debug('drainOnce finished', { accepted, failed, skipped, pending: pending.length });
    }

    return { accepted, failed, skipped };
  }

  /** Drop accepted rows older than retentionDays. Call once per app session. */
  async pruneAccepted(retentionDays = 14): Promise<number> {
    const n = await getSessionService().pruneOutbox(retentionDays, ['accepted']);
    if (n > 0) log.info('pruned accepted outbox rows', { count: n, retentionDays });
    return n;
  }

  async pruneFailed(retentionDays = 90): Promise<number> {
    const n = await getSessionService().pruneOutbox(retentionDays, ['failed']);
    if (n > 0) log.info('pruned failed outbox rows', { count: n, retentionDays });
    return n;
  }
}

export const outboxDrain = new OutboxDrainService();
