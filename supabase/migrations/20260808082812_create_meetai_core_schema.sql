/*
# MeetAI Core Schema — Meetings, Transcripts, Action Items

Creates the foundational tables for the AI Meeting Intelligence Platform.

## New Tables
1. `profiles` — extends auth.users with name, avatar, role, preferences
2. `meetings` — user-owned meetings with title, date, participants, agenda, status
3. `transcripts` — full transcript + segments (jsonb) per meeting
4. `action_items` — extracted tasks with owner, deadline, priority, status
5. `decisions` — key decisions per meeting
6. `topics` — hierarchical topics/subtopics per meeting

## Security
- RLS enabled on every table
- All tables are owner-scoped via user_id (DEFAULT auth.uid())
- Child tables scoped through meetings ownership
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), TO authenticated
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- MEETINGS
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '10:00',
  duration_minutes integer DEFAULT 60,
  participants text[] DEFAULT '{}',
  agenda text DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled',
  recording_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meetings" ON meetings;
CREATE POLICY "select_own_meetings" ON meetings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_meetings" ON meetings;
CREATE POLICY "insert_own_meetings" ON meetings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_meetings" ON meetings;
CREATE POLICY "update_own_meetings" ON meetings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_meetings" ON meetings;
CREATE POLICY "delete_own_meetings" ON meetings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);

-- TRANSCRIPTS
CREATE TABLE IF NOT EXISTS transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  full_text text NOT NULL DEFAULT '',
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transcripts" ON transcripts;
CREATE POLICY "select_own_transcripts" ON transcripts FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = transcripts.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_transcripts" ON transcripts;
CREATE POLICY "insert_own_transcripts" ON transcripts FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = transcripts.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_transcripts" ON transcripts;
CREATE POLICY "update_own_transcripts" ON transcripts FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = transcripts.meeting_id AND meetings.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = transcripts.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_transcripts" ON transcripts;
CREATE POLICY "delete_own_transcripts" ON transcripts FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = transcripts.meeting_id AND meetings.user_id = auth.uid()));

-- ACTION ITEMS
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  owner text NOT NULL DEFAULT 'Unassigned',
  deadline date,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  context text DEFAULT '',
  ai_generated boolean NOT NULL DEFAULT false,
  source_speaker text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_action_items" ON action_items;
CREATE POLICY "select_own_action_items" ON action_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_action_items" ON action_items;
CREATE POLICY "insert_own_action_items" ON action_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_action_items" ON action_items;
CREATE POLICY "update_own_action_items" ON action_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_action_items" ON action_items;
CREATE POLICY "delete_own_action_items" ON action_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_action_items_user_id ON action_items(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id ON action_items(meeting_id);

-- DECISIONS
CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text text NOT NULL,
  context text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_decisions" ON decisions;
CREATE POLICY "select_own_decisions" ON decisions FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = decisions.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_decisions" ON decisions;
CREATE POLICY "insert_own_decisions" ON decisions FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = decisions.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_decisions" ON decisions;
CREATE POLICY "update_own_decisions" ON decisions FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = decisions.meeting_id AND meetings.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = decisions.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_decisions" ON decisions;
CREATE POLICY "delete_own_decisions" ON decisions FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = decisions.meeting_id AND meetings.user_id = auth.uid()));

-- TOPICS
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  parent_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'topic',
  discussion text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_topics" ON topics;
CREATE POLICY "select_own_topics" ON topics FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = topics.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_topics" ON topics;
CREATE POLICY "insert_own_topics" ON topics FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = topics.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_topics" ON topics;
CREATE POLICY "update_own_topics" ON topics FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = topics.meeting_id AND meetings.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = topics.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_topics" ON topics;
CREATE POLICY "delete_own_topics" ON topics FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = topics.meeting_id AND meetings.user_id = auth.uid()));
