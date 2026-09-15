/*
# Create boards table for CaseBoard persistence

1. New Tables
- `boards` — stores board metadata (id, name, created_at, updated_at)
- `board_data` — stores full board state JSON (nodes, connections, groups, texts, drawings, shapes)
  This is a single-row-per-board design that stores the entire BoardState as JSONB.
  This matches the app's existing architecture where the entire state is saved as one unit.

2. Security
- Single-tenant app (no auth). Enable RLS on both tables.
- Allow anon + authenticated full CRUD since the data is intentionally shared/public.
- USING (true) is acceptable here because this is a no-auth single-tenant app.

3. Design Notes
- `board_data.state` is JSONB containing the full BoardState object.
- `board_data.updated_at` tracks the last save time for sync/conflict detection.
- Boards table has `name` and `created_at` for listing.
- Both tables use UUID primary keys generated client-side (text type for compatibility with existing app IDs).
*/

CREATE TABLE IF NOT EXISTS boards (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT 'Yeni Pano',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_boards" ON boards;
CREATE POLICY "anon_select_boards" ON boards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_boards" ON boards;
CREATE POLICY "anon_insert_boards" ON boards FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_boards" ON boards;
CREATE POLICY "anon_update_boards" ON boards FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_boards" ON boards;
CREATE POLICY "anon_delete_boards" ON boards FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS board_data (
  board_id text PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE board_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_board_data" ON board_data;
CREATE POLICY "anon_select_board_data" ON board_data FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_board_data" ON board_data;
CREATE POLICY "anon_insert_board_data" ON board_data FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_board_data" ON board_data;
CREATE POLICY "anon_update_board_data" ON board_data FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_board_data" ON board_data;
CREATE POLICY "anon_delete_board_data" ON board_data FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_boards_updated_at ON boards(updated_at DESC);
