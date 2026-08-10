import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { generateChatResponse } from '@/lib/ai-engine';
import { PageLoader, EmptyState, Spinner } from '@/components/ui/States';
import { Bot, Send, Plus, Trash2, MessageSquare, Sparkles, FileText } from 'lucide-react';
import { relativeTime } from '@/lib/utils';
import type { ActionItem, ChatSession, ChatMessage } from '@/types';

export function AssistantPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<ActionItem[]>([]);
  const [meetingsData, setMeetingsData] = useState<{ id: string; title: string; meeting_date: string; transcript_text: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
    loadContext();
  }, []);

  useEffect(() => {
    if (activeSession) loadMessages(activeSession.id);
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setSessions((data || []) as ChatSession[]);
      if (data && data.length > 0 && !activeSession) {
        setActiveSession(data[0] as ChatSession);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadContext = async () => {
    try {
      const [tasksRes, meetingsRes, transcriptsRes] = await Promise.all([
        supabase.from('action_items').select('*').order('created_at', { ascending: false }),
        supabase.from('meetings').select('id, title, meeting_date').order('meeting_date', { ascending: false }),
        supabase.from('transcripts').select('meeting_id, full_text'),
      ]);
      const transcriptMap = new Map<string, string>();
      for (const t of transcriptsRes.data || []) {
        transcriptMap.set(t.meeting_id, t.full_text);
      }
      setPendingTasks((tasksRes.data || []) as ActionItem[]);
      setMeetingsData((meetingsRes.data || []).map((m) => ({
        ...m,
        transcript_text: transcriptMap.get(m.id) || '',
      })));
    } catch { /* silent */ }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load messages', 'error');
    }
  };

  const handleNewSession = async () => {
    try {
      const { data, error } = await supabase.from('chat_sessions').insert({ title: 'New Conversation' }).select('*').maybeSingle();
      if (error) throw error;
      if (data) {
        const newSession = data as ChatSession;
        setSessions((prev) => [newSession, ...prev]);
        setActiveSession(newSession);
        setMessages([]);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create session', 'error');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await supabase.from('chat_sessions').delete().eq('id', id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSession?.id === id) {
        setActiveSession(sessions.find((s) => s.id !== id) || null);
        setMessages([]);
      }
      toast('Conversation deleted', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    if (!activeSession) {
      await handleNewSession();
      return;
    }

    const userContent = input;
    setInput('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg = { id: 'temp-user', session_id: activeSession.id, role: 'user', content: userContent, sources: [], created_at: new Date().toISOString() } as unknown as ChatMessage;
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Save user message
      await supabase.from('chat_messages').insert({ session_id: activeSession.id, role: 'user', content: userContent });

      // Generate response
      const { response, sources } = generateChatResponse(userContent, {
        pendingTasks,
        recentMeetings: meetingsData.map((m) => ({ id: m.id, title: m.title, meeting_date: m.meeting_date })),
        meetings: meetingsData,
      });

      // Save assistant message
      const { data: savedMsg } = await supabase.from('chat_messages').insert({
        session_id: activeSession.id,
        role: 'assistant',
        content: response,
        sources,
      }).select('*').maybeSingle();

      // Update session title if it's the first message
      if (sessions.length === 1 && sessions[0].title === 'New Conversation') {
        const newTitle = userContent.substring(0, 40) + (userContent.length > 40 ? '...' : '');
        await supabase.from('chat_sessions').update({ title: newTitle, updated_at: new Date().toISOString() }).eq('id', activeSession.id);
        setSessions((prev) => prev.map((s) => s.id === activeSession.id ? { ...s, title: newTitle } : s));
      }

      // Reload messages to get saved versions
      await loadMessages(activeSession.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader />;

  const suggestedQuestions = [
    'What are my pending tasks?',
    'Summarize the last meeting',
    'What decisions were taken?',
    'Who is responsible for the UI?',
    'What was discussed about the API?',
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Session list */}
      <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <button onClick={handleNewSession} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No conversations yet</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveSession(s)}
                className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  activeSession?.id === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{s.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col">
        {activeSession ? (
          <>
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">{activeSession.title}</h2>
                  <p className="text-xs text-slate-400">AI Meeting Assistant</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Ask me anything about your meetings</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-md">I can help you find information from past meetings, summarize discussions, check your tasks, and more.</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {suggestedQuestions.map((q) => (
                      <button key={q} onClick={() => setInput(q)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-sm text-slate-600 rounded-full transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-200'
                      }`}>
                        {msg.role === 'user' ? <span className="text-white text-xs font-bold">U</span> : <Bot className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {msg.content}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-1.5">
                            <p className="text-xs font-medium opacity-70 flex items-center gap-1"><FileText className="w-3 h-3" /> Sources:</p>
                            {msg.sources.map((src, j) => (
                              <Link key={j} to={`/app/meetings/${src.meeting_id}`} className="block text-xs underline opacity-80 hover:opacity-100">
                                {src.meeting_title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="bg-slate-100 px-4 py-2.5 rounded-2xl">
                      <Spinner className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your meetings, tasks, or decisions..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button onClick={handleSend} disabled={sending || !input.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={Bot} title="Start a conversation" description="Create a new chat to start asking questions about your meetings." action={
            <button onClick={handleNewSession} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> New Chat
            </button>
          } />
        )}
      </div>
    </div>
  );
}
