-- Standalone workbench database draft.
-- This is a future self-hosted schema; it is not executed by the static app.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workbench_snapshots (
  profile_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workbench_sync_events (
  event_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  base_revision INTEGER NOT NULL,
  result_revision INTEGER,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'conflict', 'rejected', 'failed')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES workbench_snapshots(profile_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workbench_sync_events_profile_time
  ON workbench_sync_events(profile_id, created_at);
