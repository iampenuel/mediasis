export const schemaSql = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS terms_local (
  id TEXT PRIMARY KEY NOT NULL,
  term TEXT NOT NULL,
  pronunciation TEXT NOT NULL,
  definition TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_terms_term ON terms_local(term);
CREATE INDEX IF NOT EXISTS idx_terms_category ON terms_local(category);

CREATE TABLE IF NOT EXISTS user_term_state_local (
  term_id TEXT PRIMARY KEY NOT NULL,
  mastery REAL NOT NULL DEFAULT 0,
  stability_days REAL NOT NULL DEFAULT 0.25,
  due_at INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (term_id) REFERENCES terms_local(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_term_due ON user_term_state_local(due_at);
CREATE INDEX IF NOT EXISTS idx_user_term_mastery ON user_term_state_local(mastery);

CREATE TABLE IF NOT EXISTS lesson_sessions_local (
  id TEXT PRIMARY KEY NOT NULL,
  mode TEXT NOT NULL,
  total_steps INTEGER NOT NULL,
  completed_steps INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  completed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  sync_attempted_at INTEGER NULL,
  synced_at INTEGER NULL,
  FOREIGN KEY (term_id) REFERENCES terms_local(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(sync_status, created_at);

CREATE TABLE IF NOT EXISTS search_cache (
  term TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;
