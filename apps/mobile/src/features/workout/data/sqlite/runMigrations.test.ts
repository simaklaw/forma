import { runMigrations } from './runMigrations';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS } from './schema';

/**
 * Minimal synchronous fake DB — no native SQLite needed in Jest.
 * Replays SQL against an in-memory map so we can check user_version and
 * that tables were created.
 */
function createFakeDb() {
  let userVersion = 0;
  const tables = new Set<string>();
  const executed: string[] = [];

  const db = {
    getFirstSync<T>(sql: string): T | null {
      if (sql === 'PRAGMA user_version') {
        return { user_version: userVersion } as unknown as T;
      }
      if (sql.includes('sqlite_master') && sql.includes('workout_session')) {
        return tables.has('workout_session')
          ? ({ name: 'workout_session' } as unknown as T)
          : null;
      }
      return null;
    },
    execSync(sql: string): void {
      executed.push(sql.trim());
      const vMatch = sql.match(/PRAGMA user_version = (\d+)/);
      if (vMatch) {
        userVersion = parseInt(vMatch[1]!, 10);
        return;
      }
      const tMatch = sql.match(/CREATE TABLE (\w+)/g);
      if (tMatch) {
        tMatch.forEach((m) => {
          const name = m.replace('CREATE TABLE ', '').trim();
          tables.add(name);
        });
      }
    },
    seedTable(name: string) {
      tables.add(name);
    },
    getUserVersion: () => userVersion,
    getTables: () => [...tables],
    getExecuted: () => [...executed]
  };

  return db;
}

describe('runMigrations', () => {
  it('applies all migrations on a fresh database', () => {
    const db = createFakeDb();
    runMigrations(db);
    expect(db.getUserVersion()).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.getTables()).toContain('workout_session');
    expect(db.getTables()).toContain('session_event');
    expect(db.getTables()).toContain('outbox');
  });

  it('is idempotent — calling twice does not re-run migrations', () => {
    const db = createFakeDb();
    runMigrations(db);
    const countAfterFirst = db.getExecuted().length;
    runMigrations(db);
    expect(db.getExecuted().length).toBe(countAfterFirst);
  });

  it('applies only the pending migrations when starting from a mid-point version', () => {
    const db = createFakeDb();
    db.execSync('PRAGMA user_version = 1');
    const executedBefore = db.getExecuted().length;

    runMigrations(db);

    const newSql = db.getExecuted().slice(executedBefore);
    const hasV1Tables = newSql.some((s) => s.includes('CREATE TABLE workout_session'));
    expect(hasV1Tables).toBe(false);
    expect(db.getUserVersion()).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('stamps user_version=1 when v1 tables already exist (pre-runner installs)', () => {
    const db = createFakeDb();
    db.seedTable('workout_session');
    runMigrations(db);
    expect(db.getUserVersion()).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.getExecuted().some((s) => s.includes('CREATE TABLE workout_session'))).toBe(false);
  });

  it('wraps each migration in BEGIN IMMEDIATE / COMMIT', () => {
    const db = createFakeDb();
    runMigrations(db);
    const executed = db.getExecuted();

    MIGRATIONS.forEach((m) => {
      const beginIdx = executed.findIndex(
        (s, i) => s === 'BEGIN IMMEDIATE' && executed[i + 1]?.includes('CREATE TABLE')
      );
      expect(beginIdx).toBeGreaterThanOrEqual(0);
      expect(m.version).toBeGreaterThan(0);
    });

    expect(executed).toContain('COMMIT');
  });

  it('throws and rolls back if migration SQL is invalid', () => {
    const db = createFakeDb();
    const originalExec = db.execSync.bind(db);
    let throwOnce = false;
    db.execSync = (sql: string) => {
      if (!throwOnce && sql.includes('CREATE TABLE workout_session')) {
        throwOnce = true;
        throw new Error('simulated SQL error');
      }
      originalExec(sql);
    };

    expect(() => runMigrations(db)).toThrow(/Migration v1 failed/);
    expect(db.getUserVersion()).toBe(0);
  });
});
