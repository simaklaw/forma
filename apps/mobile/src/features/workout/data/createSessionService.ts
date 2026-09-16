import { MemorySessionRepository } from './MemorySessionRepository';
import { SessionCommandService } from './SessionCommandService';
import type { SessionRepository } from './SessionRepository';
import { SqliteSessionRepository, type SqliteDatabase } from './sqlite/SqliteSessionRepository';

export type SessionPersistenceMode = 'memory' | 'sqlite';

let singleton: SessionCommandService | null = null;
let mode: SessionPersistenceMode = 'memory';

/**
 * Process-wide session service.
 * Default is memory (tests / first boot). Call `configureSessionPersistence('sqlite', db)`
 * after expo-sqlite is available in the native runtime.
 */
export function getSessionService(): SessionCommandService {
  if (!singleton) {
    singleton = new SessionCommandService(new MemorySessionRepository());
    mode = 'memory';
  }
  return singleton;
}

export function getSessionPersistenceMode(): SessionPersistenceMode {
  return mode;
}

/**
 * Switch to SQLite. Safe to call once at App bootstrap on device/emulator.
 * @example
 * import * as SQLite from 'expo-sqlite';
 * import { configureSessionPersistence, WORKOUT_DB_NAME } from '@/features/workout/data';
 * configureSessionPersistence('sqlite', SQLite.openDatabaseSync(WORKOUT_DB_NAME));
 */
export function configureSessionPersistence(
  next: 'sqlite',
  db: SqliteDatabase
): SessionCommandService;
export function configureSessionPersistence(next: 'memory'): SessionCommandService;
export function configureSessionPersistence(
  next: SessionPersistenceMode,
  db?: SqliteDatabase
): SessionCommandService {
  let repo: SessionRepository;
  if (next === 'sqlite') {
    if (!db) throw new Error('sqlite mode requires a database handle');
    const sqliteRepo = new SqliteSessionRepository(db);
    sqliteRepo.ensureSchema();
    repo = sqliteRepo;
  } else {
    repo = new MemorySessionRepository();
  }
  singleton = new SessionCommandService(repo);
  mode = next;
  return singleton;
}

/** Test-only: wipe singleton between suites. */
export function resetSessionServiceForTests(): void {
  singleton = null;
  mode = 'memory';
}
