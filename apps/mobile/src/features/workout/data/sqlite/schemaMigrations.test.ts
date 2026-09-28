import { SqliteSessionRepository, type SqliteDatabase } from './SqliteSessionRepository';

function createDb(initialVersion = 0): SqliteDatabase & { versions: number[]; execLog: string[] } {
  let version = initialVersion;
  const versions: number[] = [];
  const execLog: string[] = [];
  return {
    versions,
    execLog,
    execSync(sql) {
      execLog.push(sql.trim());
      const match = sql.match(/^PRAGMA user_version = (\d+)$/);
      if (match) {
        version = Number(match[1]);
        versions.push(version);
      }
    },
    runSync: () => ({ changes: 0 }),
    getFirstSync<T>(sql) {
      if (sql.trim() === 'PRAGMA user_version') {
        return { user_version: version } as T;
      }
      return null;
    },
    getAllSync: () => []
  };
}

describe('SQLite schema migrations', () => {
  it('applies each pending version in order and becomes idempotent', () => {
    const db = createDb(0);
    const repo = new SqliteSessionRepository(db);

    repo.ensureSchema();
    repo.ensureSchema();

    expect(db.versions).toEqual([1, 2]);
    expect(db.execLog.filter((sql) => sql === 'BEGIN IMMEDIATE')).toHaveLength(2);
    expect(db.execLog.filter((sql) => sql === 'COMMIT')).toHaveLength(2);
  });

  it('upgrades an old v1 database without replaying v1', () => {
    const db = createDb(1);
    const repo = new SqliteSessionRepository(db);

    repo.ensureSchema();

    expect(db.versions).toEqual([2]);
  });

  it('rejects a database created by a newer app version', () => {
    const db = createDb(99);
    const repo = new SqliteSessionRepository(db);

    expect(() => repo.ensureSchema()).toThrow(/newer than app schema/);
  });
});
