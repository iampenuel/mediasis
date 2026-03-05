import * as SQLite from 'expo-sqlite';

import { starterSource, starterTerms } from '../data/starterTerms';
import { logInfo } from '../lib/logging';
import { schemaSql } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getTableColumns(db: SQLite.SQLiteDatabase, table: string) {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(rows.map((row) => row.name));
}

async function migrateOutboxColumns(db: SQLite.SQLiteDatabase) {
  const columns = await getTableColumns(db, 'outbox_events');
  const migrations: { name: string; sql: string }[] = [
    { name: 'retry_count', sql: 'ALTER TABLE outbox_events ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0' },
    { name: 'last_error', sql: 'ALTER TABLE outbox_events ADD COLUMN last_error TEXT NULL' },
    { name: 'sync_attempted_at', sql: 'ALTER TABLE outbox_events ADD COLUMN sync_attempted_at INTEGER NULL' },
    { name: 'synced_at', sql: 'ALTER TABLE outbox_events ADD COLUMN synced_at INTEGER NULL' },
  ];

  for (const migration of migrations) {
    if (!columns.has(migration.name)) {
      await db.execAsync(migration.sql);
    }
  }
}

async function seedDb(db: SQLite.SQLiteDatabase) {
  const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM terms_local');
  const count = countResult?.count ?? 0;

  if (count > 0) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const term of starterTerms) {
      await tx.runAsync(
        `
        INSERT INTO terms_local (id, term, pronunciation, definition, example_sentence, category, difficulty)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        term.id,
        term.term,
        term.pronunciation,
        term.definition,
        term.exampleSentence,
        term.category,
        term.difficulty,
      );
    }
  });

  logInfo('Seeded local terms', { source: starterSource, count: starterTerms.length });
}

async function createDb() {
  const db = await SQLite.openDatabaseAsync('mediasis.db');
  await db.execAsync(schemaSql);
  await migrateOutboxColumns(db);
  await seedDb(db);
  return db;
}

export async function initDb() {
  if (!dbPromise) {
    dbPromise = createDb();
  }

  return dbPromise;
}
