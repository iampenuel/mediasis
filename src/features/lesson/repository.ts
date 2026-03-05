import { initDb } from '../../db';

import type { LessonMode, Term, UserTermState } from './types';

type SqlTermRow = {
  id: string;
  term: string;
  pronunciation: string;
  definition: string;
  example_sentence: string;
  category: string;
  difficulty: number;
};

type SqlStateRow = {
  term_id: string;
  mastery: number;
  stability_days: number;
  due_at: number;
  correct_count: number;
  incorrect_count: number;
};

type OutboxRow = {
  id: number;
  term_id: string;
  event_type: string;
  payload_json: string;
  created_at: number;
  retry_count: number;
  sync_status: 'pending' | 'failed' | 'synced';
};

export type QueueSource = {
  terms: Term[];
  stateMap: Map<string, UserTermState>;
};

function mapTerm(row: SqlTermRow): Term {
  return {
    id: row.id,
    term: row.term,
    pronunciation: row.pronunciation,
    definition: row.definition,
    exampleSentence: row.example_sentence,
    category: row.category,
    difficulty: row.difficulty,
  };
}

function mapState(row: SqlStateRow): UserTermState {
  return {
    termId: row.term_id,
    mastery: row.mastery,
    stabilityDays: row.stability_days,
    dueAt: row.due_at,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
  };
}

export async function loadQueueSource(category?: string): Promise<QueueSource> {
  const db = await initDb();
  const termsRows = category
    ? await db.getAllAsync<SqlTermRow>(
        `
        SELECT id, term, pronunciation, definition, example_sentence, category, difficulty
        FROM terms_local
        WHERE category = ?
        ORDER BY term ASC
      `,
        category,
      )
    : await db.getAllAsync<SqlTermRow>(
        `
        SELECT id, term, pronunciation, definition, example_sentence, category, difficulty
        FROM terms_local
        ORDER BY term ASC
      `,
      );

  const states = await db.getAllAsync<SqlStateRow>(
    `
      SELECT term_id, mastery, stability_days, due_at, correct_count, incorrect_count
      FROM user_term_state_local
    `,
  );

  const stateMap = new Map(states.map((state) => [state.term_id, mapState(state)]));
  return {
    terms: termsRows.map(mapTerm),
    stateMap,
  };
}

export async function saveUserTermState(state: UserTermState) {
  const db = await initDb();
  const now = Date.now();

  await db.runAsync(
    `
      INSERT INTO user_term_state_local (
        term_id, mastery, stability_days, due_at, correct_count, incorrect_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(term_id) DO UPDATE SET
        mastery = excluded.mastery,
        stability_days = excluded.stability_days,
        due_at = excluded.due_at,
        correct_count = excluded.correct_count,
        incorrect_count = excluded.incorrect_count,
        updated_at = excluded.updated_at
    `,
    state.termId,
    state.mastery,
    state.stabilityDays,
    state.dueAt,
    state.correctCount,
    state.incorrectCount,
    now,
  );
}

export async function insertOutboxEvent(termId: string, payload: Record<string, unknown>) {
  const db = await initDb();

  await db.runAsync(
    `
      INSERT INTO outbox_events (term_id, event_type, payload_json, created_at, sync_status)
      VALUES (?, ?, ?, ?, 'pending')
    `,
    termId,
    'term_answer',
    JSON.stringify(payload),
    Date.now(),
  );
}

export async function saveLessonSession({
  id,
  mode,
  totalSteps,
  completedSteps,
  correctAnswers,
  xpEarned,
}: {
  id: string;
  mode: LessonMode;
  totalSteps: number;
  completedSteps: number;
  correctAnswers: number;
  xpEarned: number;
}) {
  const db = await initDb();
  await db.runAsync(
    `
      INSERT INTO lesson_sessions_local (
        id, mode, total_steps, completed_steps, correct_answers, xp_earned, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    mode,
    totalSteps,
    completedSteps,
    correctAnswers,
    xpEarned,
    Date.now(),
  );
}

export async function getDashboardStats() {
  const db = await initDb();
  const lessonCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM lesson_sessions_local WHERE completed_steps > 0',
  );
  const totalXp = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(xp_earned), 0) AS total FROM lesson_sessions_local',
  );
  const mastered = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM user_term_state_local WHERE mastery >= 0.8',
  );
  const due = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM user_term_state_local WHERE due_at <= ?',
    Date.now(),
  );
  const weak = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM user_term_state_local WHERE mastery < 0.45',
  );

  return {
    lessonCount: lessonCount?.count ?? 0,
    totalXp: totalXp?.total ?? 0,
    masteredCount: mastered?.count ?? 0,
    dueCount: due?.count ?? 0,
    weakCount: weak?.count ?? 0,
  };
}

export async function searchTerms(search: string, limit = 40) {
  const db = await initDb();
  const query = search.trim();
  const terms = query
    ? await db.getAllAsync<SqlTermRow>(
        `
        SELECT id, term, pronunciation, definition, example_sentence, category, difficulty
        FROM terms_local
        WHERE term LIKE ? OR definition LIKE ?
        ORDER BY term ASC
        LIMIT ?
      `,
        `%${query}%`,
        `%${query}%`,
        limit,
      )
    : await db.getAllAsync<SqlTermRow>(
        `
        SELECT id, term, pronunciation, definition, example_sentence, category, difficulty
        FROM terms_local
        ORDER BY term ASC
        LIMIT ?
      `,
        limit,
      );

  return terms.map(mapTerm);
}

export async function getCategories() {
  const db = await initDb();
  const rows = await db.getAllAsync<{ category: string; count: number }>(
    `
      SELECT category, COUNT(*) AS count
      FROM terms_local
      GROUP BY category
      ORDER BY category ASC
    `,
  );

  return rows;
}

export async function countNewTerms() {
  const db = await initDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM terms_local t
      WHERE NOT EXISTS (
        SELECT 1 FROM user_term_state_local s WHERE s.term_id = t.id
      )
    `,
  );
  return row?.count ?? 0;
}

export async function getPendingSyncCount() {
  const db = await initDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM outbox_events
      WHERE sync_status != 'synced'
    `,
  );
  return row?.count ?? 0;
}

export type OutboxEvent = {
  id: number;
  termId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  syncStatus: 'pending' | 'failed' | 'synced';
};

export async function listSyncReadyOutboxEvents(limit = 25, now = Date.now()): Promise<OutboxEvent[]> {
  const db = await initDb();

  const rows = await db.getAllAsync<OutboxRow>(
    `
      SELECT id, term_id, event_type, payload_json, created_at, retry_count, sync_status
      FROM outbox_events
      WHERE sync_status = 'pending'
      AND (
        sync_attempted_at IS NULL
        OR sync_attempted_at <= ? - (
          CASE
            WHEN retry_count <= 0 THEN 0
            WHEN retry_count = 1 THEN 10000
            WHEN retry_count = 2 THEN 30000
            WHEN retry_count = 3 THEN 120000
            ELSE 300000
          END
        )
      )
      ORDER BY created_at ASC
      LIMIT ?
    `,
    now,
    limit,
  );

  return rows.map((row) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    } catch {
      payload = {};
    }

    return {
      id: row.id,
      termId: row.term_id,
      eventType: row.event_type,
      payload,
      createdAt: row.created_at,
      retryCount: row.retry_count,
      syncStatus: row.sync_status,
    };
  });
}

export async function markOutboxSynced(ids: number[]) {
  if (ids.length === 0) {
    return;
  }

  const db = await initDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `
      UPDATE outbox_events
      SET sync_status = 'synced', synced_at = ?, last_error = NULL
      WHERE id IN (${placeholders})
    `,
    Date.now(),
    ...ids,
  );
}

export async function markOutboxFailed(id: number, reason: string) {
  const db = await initDb();
  const now = Date.now();
  await db.runAsync(
    `
      UPDATE outbox_events
      SET
        retry_count = retry_count + 1,
        sync_status = CASE WHEN retry_count + 1 >= 7 THEN 'failed' ELSE 'pending' END,
        last_error = ?,
        sync_attempted_at = ?
      WHERE id = ?
    `,
    reason.slice(0, 280),
    now,
    id,
  );
}

export async function markOutboxAttempted(ids: number[]) {
  if (ids.length === 0) {
    return;
  }

  const db = await initDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `
      UPDATE outbox_events
      SET sync_attempted_at = ?
      WHERE id IN (${placeholders})
    `,
    Date.now(),
    ...ids,
  );
}
