export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  preferences: {
    summary_style?: string;
    summary_length?: string;
    ai_language?: string;
    email_notifications?: boolean;
    task_reminders?: boolean;
    meeting_reminders?: boolean;
    deadline_alerts?: boolean;
    timezone?: string;
  };
  created_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  description: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  participants: string[];
  agenda: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  full_text: string;
  segments: TranscriptSegment[];
  language: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  meeting_id: string | null;
  user_id: string;
  description: string;
  owner: string;
  deadline: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  context: string;
  ai_generated: boolean;
  source_speaker: string | null;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  meeting_id: string;
  text: string;
  context: string;
  created_at: string;
}

export interface Topic {
  id: string;
  meeting_id: string;
  title: string;
  parent_id: string | null;
  type: 'topic' | 'subtopic' | 'discussion' | 'decision';
  discussion: string;
  created_at: string;
}

export interface Summary {
  id: string;
  meeting_id: string;
  quick_summary: string;
  detailed_summary: string;
  highlights: string[];
  key_points: string[];
  minutes: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

export interface AiInsight {
  id: string;
  meeting_id: string | null;
  user_id: string;
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

export interface SentimentAnalysis {
  id: string;
  meeting_id: string;
  overall: 'positive' | 'neutral' | 'negative';
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  per_segment: { text: string; sentiment: string }[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  context_meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: { meeting_id: string; meeting_title: string; snippet: string }[];
  created_at: string;
}

export interface MeetingEmbedding {
  id: string;
  meeting_id: string;
  user_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
