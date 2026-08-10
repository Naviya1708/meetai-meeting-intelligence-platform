/*
# MeetAI Extended Schema — Summaries, Notifications, AI, Chat, Embeddings

## New Tables
1. `summaries` — AI-generated summaries per meeting (quick, detailed, highlights, minutes)
2. `notifications` — user notifications (task reminders, meeting reminders, etc.)
3. `ai_insights` — AI-generated insights per meeting
4. `sentiment_analysis` — sentiment data per meeting
5. `chat_sessions` + `chat_messages` — AI assistant conversation history
6. `meeting_embeddings` — vector embeddings of transcript chunks for RAG

## Security
- RLS enabled on every table
- Owner-scoped via user_id or through meetings ownership
- 4 policies per table, TO authenticated
*/

-- SUMMARIES
CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  quick_summary text DEFAULT '',
  detailed_summary text DEFAULT '',
  highlights jsonb DEFAULT '[]'::jsonb,
  key_points jsonb DEFAULT '[]'::jsonb,
  minutes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_summaries" ON summaries;
CREATE POLICY "select_own_summaries" ON summaries FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = summaries.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_summaries" ON summaries;
CREATE POLICY "insert_own_summaries" ON summaries FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = summaries.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_summaries" ON summaries;
CREATE POLICY "update_own_summaries" ON summaries FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = summaries.meeting_id AND meetings.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = summaries.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_summaries" ON summaries;
CREATE POLICY "delete_own_summaries" ON summaries FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = summaries.meeting_id AND meetings.user_id = auth.uid()));

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- AI INSIGHTS
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_insights" ON ai_insights;
CREATE POLICY "select_own_insights" ON ai_insights FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_insights" ON ai_insights;
CREATE POLICY "insert_own_insights" ON ai_insights FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_insights" ON ai_insights;
CREATE POLICY "update_own_insights" ON ai_insights FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_insights" ON ai_insights;
CREATE POLICY "delete_own_insights" ON ai_insights FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SENTIMENT ANALYSIS
CREATE TABLE IF NOT EXISTS sentiment_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  overall text NOT NULL DEFAULT 'neutral',
  positive_pct numeric DEFAULT 0,
  neutral_pct numeric DEFAULT 0,
  negative_pct numeric DEFAULT 0,
  per_segment jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sentiment" ON sentiment_analysis;
CREATE POLICY "select_own_sentiment" ON sentiment_analysis FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = sentiment_analysis.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_sentiment" ON sentiment_analysis;
CREATE POLICY "insert_own_sentiment" ON sentiment_analysis FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = sentiment_analysis.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_sentiment" ON sentiment_analysis;
CREATE POLICY "update_own_sentiment" ON sentiment_analysis FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = sentiment_analysis.meeting_id AND meetings.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = sentiment_analysis.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_sentiment" ON sentiment_analysis;
CREATE POLICY "delete_own_sentiment" ON sentiment_analysis FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = sentiment_analysis.meeting_id AND meetings.user_id = auth.uid()));

-- CHAT SESSIONS
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  context_meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_sessions" ON chat_sessions;
CREATE POLICY "select_own_chat_sessions" ON chat_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_sessions" ON chat_sessions;
CREATE POLICY "insert_own_chat_sessions" ON chat_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_sessions" ON chat_sessions;
CREATE POLICY "update_own_chat_sessions" ON chat_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_sessions" ON chat_sessions;
CREATE POLICY "delete_own_chat_sessions" ON chat_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()));

-- MEETING EMBEDDINGS (for RAG)
CREATE TABLE IF NOT EXISTS meeting_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  chunk_text text NOT NULL,
  embedding jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_embeddings" ON meeting_embeddings;
CREATE POLICY "select_own_embeddings" ON meeting_embeddings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_embeddings" ON meeting_embeddings;
CREATE POLICY "insert_own_embeddings" ON meeting_embeddings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_embeddings" ON meeting_embeddings;
CREATE POLICY "delete_own_embeddings" ON meeting_embeddings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON meeting_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_meeting_id ON meeting_embeddings(meeting_id);
