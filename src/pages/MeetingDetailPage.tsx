import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { analyzeAndStoreMeeting, uploadRecordingAndGetTranscript, validateRecordingFile, downloadRecording, type ProcessingState } from '@/lib/services';
import { computeSpeakerStats, predictDeadlineRisk } from '@/lib/ai-engine';
import { PageLoader, EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { formatDate, formatTime, statusColor, formatStatus, priorityColor, daysUntil, relativeTime } from '@/lib/utils';
import type { Meeting, Transcript, ActionItem, Decision, Topic, Summary, SentimentAnalysis, AiInsight } from '@/types';
import {
  CalendarDays, Clock, Users, FileText, CheckSquare, MessageSquare,
  BarChart3, Smile, Bot, ArrowLeft, Upload, Sparkles, Download,
  AlertCircle, TrendingUp, Search, Send, User, Plus, Trash2, ChevronRight,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

type Tab = 'overview' | 'summary' | 'transcript' | 'decisions' | 'action-items' | 'topics' | 'insights' | 'speakers' | 'sentiment' | 'ask-ai';

export function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [downloadingRecording, setDownloadingRecording] = useState(false);

  useEffect(() => {
    if (id) loadAll(id);
  }, [id]);

  const loadAll = async (meetingId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [m, t, s, d, top, ai, ins, sen] = await Promise.all([
        supabase.from('meetings').select('*').eq('id', meetingId).maybeSingle(),
        supabase.from('transcripts').select('*').eq('meeting_id', meetingId).maybeSingle(),
        supabase.from('summaries').select('*').eq('meeting_id', meetingId).maybeSingle(),
        supabase.from('decisions').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: true }),
        supabase.from('topics').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: true }),
        supabase.from('action_items').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }),
        supabase.from('ai_insights').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }),
        supabase.from('sentiment_analysis').select('*').eq('meeting_id', meetingId).maybeSingle(),
      ]);

      if (m.error) throw m.error;
      if (!m.data) { setError('Meeting not found'); return; }

      setMeeting(m.data as Meeting);
      setTranscript(t.data as Transcript);
      setSummary(s.data as Summary);
      setDecisions((d.data || []) as Decision[]);
      setTopics((top.data || []) as Topic[]);
      setActionItems((ai.data || []) as ActionItem[]);
      setInsights((ins.data || []) as AiInsight[]);
      setSentiment(sen.data as SentimentAnalysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!meeting || !transcript) return;
    setAnalyzing(true);
    try {
      await analyzeAndStoreMeeting(
        meeting.id,
        transcript.segments,
        meeting.title,
        meeting.participants || [],
        meeting.duration_minutes || 60
      );
      toast('AI analysis complete! Summary, decisions, action items, and insights generated.', 'success');
      if (id) loadAll(id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = (format: 'txt' | 'pdf' | 'docx') => {
    if (!meeting) return;
    let content = `MEETAI - MEETING EXPORT\n${'='.repeat(50)}\n\n`;
    content += `Meeting: ${meeting.title}\nDate: ${formatDate(meeting.meeting_date)}\nTime: ${meeting.start_time} - ${meeting.end_time}\n`;
    content += `Duration: ${meeting.duration_minutes} minutes\nParticipants: ${(meeting.participants || []).join(', ')}\n`;
    content += `Status: ${formatStatus(meeting.status)}\n\n`;

    if (summary) {
      content += `${'─'.repeat(50)}\nQUICK SUMMARY\n${'─'.repeat(50)}\n${summary.quick_summary}\n\n`;
      content += `${'─'.repeat(50)}\nDETAILED SUMMARY\n${'─'.repeat(50)}\n${summary.detailed_summary}\n\n`;
      if (summary.highlights?.length) {
        content += `${'─'.repeat(50)}\nHIGHLIGHTS\n${'─'.repeat(50)}\n${summary.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\n`;
      }
      if (summary.key_points?.length) {
        content += `${'─'.repeat(50)}\nKEY POINTS\n${'─'.repeat(50)}\n${summary.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n`;
      }
      if (summary.minutes) {
        content += `${'─'.repeat(50)}\nMEETING MINUTES\n${'─'.repeat(50)}\n${summary.minutes}\n\n`;
      }
    }

    if (decisions.length > 0) {
      content += `${'─'.repeat(50)}\nDECISIONS\n${'─'.repeat(50)}\n${decisions.map((d, i) => `${i + 1}. ${d.text}`).join('\n')}\n\n`;
    }

    if (actionItems.length > 0) {
      content += `${'─'.repeat(50)}\nACTION ITEMS\n${'─'.repeat(50)}\n${actionItems.map((a, i) => `${i + 1}. ${a.description}\n   Owner: ${a.owner} | Priority: ${a.priority} | Deadline: ${a.deadline || 'N/A'} | Status: ${formatStatus(a.status)}`).join('\n')}\n\n`;
    }

    if (transcript) {
      content += `${'─'.repeat(50)}\nTRANSCRIPT\n${'─'.repeat(50)}\n${transcript.full_text}\n\n`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/\s+/g, '_')}.${format === 'pdf' || format === 'docx' ? 'txt' : format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported as ${format.toUpperCase()}`, 'success');
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState title="Meeting not found" description={error} onRetry={() => id && loadAll(id)} />;
  if (!meeting) return <ErrorState title="Meeting not found" />;

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: FileText },
    { key: 'summary', label: 'Summary', icon: Sparkles },
    { key: 'transcript', label: 'Transcript', icon: MessageSquare },
    { key: 'decisions', label: 'Decisions', icon: CheckSquare },
    { key: 'action-items', label: 'Action Items', icon: CheckSquare },
    { key: 'topics', label: 'Topics', icon: BarChart3 },
    { key: 'insights', label: 'AI Insights', icon: AlertCircle },
    { key: 'speakers', label: 'Speakers', icon: Users },
    { key: 'sentiment', label: 'Sentiment', icon: Smile },
    { key: 'ask-ai', label: 'Ask AI', icon: Bot },
  ];

  const hasTranscript = transcript && transcript.segments && transcript.segments.length > 0;
  const hasAnalysis = !!summary;

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link to="/app/meetings" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Meetings
      </Link>

      {/* Meeting header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-800">{meeting.title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColor(meeting.status)}`}>
                {formatStatus(meeting.status)}
              </span>
            </div>
            {meeting.description && <p className="text-sm text-slate-500">{meeting.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {meeting.recording_url && (
              <button
                onClick={async () => {
                  setDownloadingRecording(true);
                  try {
                    await downloadRecording(meeting.id, meeting.recording_url, meeting.title.replace(/\s+/g, '_'));
                  } catch (e) {
                    toast(e instanceof Error ? e.message : 'Failed to download recording', 'error');
                  } finally {
                    setDownloadingRecording(false);
                  }
                }}
                disabled={downloadingRecording}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {downloadingRecording ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {downloadingRecording ? 'Preparing...' : 'Download Recording'}
              </button>
            )}
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload Audio
            </button>
            {hasTranscript && !hasAnalysis && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {analyzing ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {analyzing ? 'Analyzing...' : 'Analyze with AI'}
              </button>
            )}
            <div className="relative group">
              <button className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
                <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">TXT</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">PDF (as TXT)</button>
                <button onClick={() => handleExport('docx')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">DOCX (as TXT)</button>
              </div>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Date</p>
              <p className="font-medium text-slate-700">{formatDate(meeting.meeting_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Time</p>
              <p className="font-medium text-slate-700">{formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Duration</p>
              <p className="font-medium text-slate-700">{meeting.duration_minutes} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Participants</p>
              <p className="font-medium text-slate-700">{meeting.participants?.length || 0} people</p>
            </div>
          </div>
        </div>

        {meeting.participants && meeting.participants.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {meeting.participants.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs text-slate-600">
                <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-semibold">
                  {p.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {meeting.agenda && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Agenda</h3>
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{meeting.agenda}</pre>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoCard label="Action Items" value={actionItems.length} icon={CheckSquare} />
                <InfoCard label="Decisions" value={decisions.length} icon={CheckSquare} />
                <InfoCard label="Topics" value={topics.length} icon={BarChart3} />
                <InfoCard label="Insights" value={insights.length} icon={AlertCircle} />
              </div>
              {!hasTranscript && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                  <Upload className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Upload a recording to get started</p>
                    <p className="text-xs text-blue-600 mt-0.5">Upload an audio file or paste a transcript to generate AI analysis, action items, and insights.</p>
                    <button onClick={() => setUploadOpen(true)} className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-800">Upload audio →</button>
                  </div>
                </div>
              )}
              {hasTranscript && !hasAnalysis && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Ready for AI analysis</p>
                    <p className="text-xs text-amber-600 mt-0.5">Click "Analyze with AI" to generate summaries, decisions, action items, and insights.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {activeTab === 'summary' && (
            summary ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" /> Quick Summary
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{summary.quick_summary}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Detailed Summary</h3>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{summary.detailed_summary}</p>
                </div>
                {summary.highlights && summary.highlights.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Highlights</h3>
                    <div className="space-y-2">
                      {summary.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                          <div className="w-6 h-6 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                          <p className="text-sm text-slate-700">{h}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {summary.key_points && summary.key_points.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Key Discussion Points</h3>
                    <div className="space-y-2">
                      {summary.key_points.map((p, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-700">{p}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {summary.minutes && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Meeting Minutes</h3>
                    <pre className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-xs">{summary.minutes}</pre>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="No summary yet" description="Run AI analysis to generate a meeting summary." />
            )
          )}

          {/* Transcript */}
          {activeTab === 'transcript' && (
            hasTranscript ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search transcript..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {transcript.segments
                    .filter((seg) => !transcriptSearch || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                    .map((seg, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                          {seg.speaker.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-slate-800">{seg.speaker}</span>
                            <span className="text-xs text-slate-400">{Math.floor(seg.start / 60)}:{String(seg.start % 60).padStart(2, '0')}</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{seg.text}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={MessageSquare} title="No transcript available" description="Upload an audio recording to generate a transcript." action={
                <button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  <Upload className="w-4 h-4" /> Upload Audio
                </button>
              } />
            )
          )}

          {/* Decisions */}
          {activeTab === 'decisions' && (
            decisions.length > 0 ? (
              <div className="space-y-3">
                {decisions.map((d, i) => (
                  <div key={d.id} className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                    <div className="w-8 h-8 bg-green-200 text-green-800 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                    <div>
                      <p className="text-sm text-slate-700">{d.text}</p>
                      {d.context && <p className="text-xs text-slate-500 mt-1">{d.context}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={CheckSquare} title="No decisions recorded" description={hasAnalysis ? "No decisions were detected in this meeting." : "Run AI analysis to extract decisions."} />
            )
          )}

          {/* Action Items */}
          {activeTab === 'action-items' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-700">Action Items ({actionItems.length})</h3>
                <button onClick={() => setAddTaskOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>
              {actionItems.length > 0 ? (
                <div className="space-y-2">
                  {actionItems.map((item) => {
                    const risk = predictDeadlineRisk(item);
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={item.status === 'completed'}
                          onChange={async () => {
                            const newStatus = item.status === 'completed' ? 'pending' : 'completed';
                            await supabase.from('action_items').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', item.id);
                            setActionItems((prev) => prev.map((a) => a.id === item.id ? { ...a, status: newStatus as ActionItem['status'] } : a));
                          }}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {item.owner}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(item.priority)}`}>{item.priority}</span>
                            {item.deadline && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                risk.risk === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                risk.risk === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                              }`}>
                                Due {formatDate(item.deadline)} ({daysUntil(item.deadline)}d)
                              </span>
                            )}
                            {item.ai_generated && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> AI
                              </span>
                            )}
                          </div>
                          {risk.risk !== 'low' && item.status !== 'completed' && (
                            <p className="text-xs text-orange-600 mt-1">{risk.explanation}</p>
                          )}
                        </div>
                        <select
                          value={item.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            await supabase.from('action_items').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', item.id);
                            setActionItems((prev) => prev.map((a) => a.id === item.id ? { ...a, status: newStatus as ActionItem['status'] } : a));
                          }}
                          className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button
                          onClick={async () => {
                            await supabase.from('action_items').delete().eq('id', item.id);
                            setActionItems((prev) => prev.filter((a) => a.id !== item.id));
                            toast('Task deleted', 'success');
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={CheckSquare} title="No action items" description={hasAnalysis ? "No action items were detected." : "Run AI analysis to extract action items."} />
              )}
            </div>
          )}

          {/* Topics */}
          {activeTab === 'topics' && (
            topics.length > 0 ? (
              <div className="space-y-3">
                {topics.map((topic) => (
                  <div key={topic.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-slate-800">{topic.title}</h4>
                    </div>
                    {topic.discussion && <p className="text-sm text-slate-600 leading-relaxed">{topic.discussion}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="No topics extracted" description={hasAnalysis ? "No topics were detected." : "Run AI analysis to extract topics."} />
            )
          )}

          {/* AI Insights */}
          {activeTab === 'insights' && (
            insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div key={insight.id} className={`p-4 rounded-xl border ${
                    insight.severity === 'critical' ? 'bg-red-50 border-red-100' :
                    insight.severity === 'warning' ? 'bg-orange-50 border-orange-100' :
                    'bg-blue-50 border-blue-100'
                  }`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                        insight.severity === 'critical' ? 'text-red-600' :
                        insight.severity === 'warning' ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{insight.title}</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={AlertCircle} title="No AI insights" description={hasAnalysis ? "No insights were generated for this meeting." : "Run AI analysis to generate insights."} />
            )
          )}

          {/* Speaker Analytics */}
          {activeTab === 'speakers' && (
            hasTranscript ? (
              <SpeakerAnalytics segments={transcript.segments} participants={meeting.participants || []} />
            ) : (
              <EmptyState icon={Users} title="No speaker data" description="Upload a transcript with speaker labels to see participation analytics." />
            )
          )}

          {/* Sentiment */}
          {activeTab === 'sentiment' && (
            sentiment ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <SentimentCard label="Positive" pct={sentiment.positive_pct} color="green" />
                  <SentimentCard label="Neutral" pct={sentiment.neutral_pct} color="slate" />
                  <SentimentCard label="Negative" pct={sentiment.negative_pct} color="red" />
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-sm text-slate-500 mb-2">Overall sentiment: <span className="font-semibold capitalize">{sentiment.overall}</span></p>
                  <p className="text-xs text-slate-400">AI-generated analysis based on keyword detection. This is not a psychological assessment.</p>
                </div>
                {sentiment.per_segment && sentiment.per_segment.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Segment-level Sentiment</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {sentiment.per_segment.map((seg, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            seg.sentiment === 'positive' ? 'bg-green-500' :
                            seg.sentiment === 'negative' ? 'bg-red-500' : 'bg-slate-400'
                          }`} />
                          <p className="text-xs text-slate-600 flex-1">{seg.text}</p>
                          <span className={`text-xs capitalize ${
                            seg.sentiment === 'positive' ? 'text-green-600' :
                            seg.sentiment === 'negative' ? 'text-red-600' : 'text-slate-500'
                          }`}>{seg.sentiment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={Smile} title="No sentiment analysis" description={hasAnalysis ? "No sentiment data available." : "Run AI analysis to generate sentiment analysis."} />
            )
          )}

          {/* Ask AI */}
          {activeTab === 'ask-ai' && (
            <AskAiTab meetingId={meeting.id} meetingTitle={meeting.title} transcriptText={transcript?.full_text || ''} />
          )}
        </div>
      </div>

      {/* Upload modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        meetingId={meeting.id}
        onUploaded={() => { setUploadOpen(false); if (id) loadAll(id); }}
      />

      {/* Add task modal */}
      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        meetingId={meeting.id}
        onAdded={(task) => { setActionItems((prev) => [task, ...prev]); setAddTaskOpen(false); toast('Task added', 'success'); }}
      />
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function SentimentCard({ label, pct, color }: { label: string; pct: number; color: 'green' | 'slate' | 'red' }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`rounded-xl p-4 border text-center ${colors[color]}`}>
      <p className="text-3xl font-bold">{pct}%</p>
      <p className="text-sm mt-1">{label}</p>
    </div>
  );
}

function SpeakerAnalytics({ segments, participants }: { segments: Transcript['segments']; participants: string[] }) {
  const stats = computeSpeakerStats(segments);
  const chartData = stats.map((s) => ({ name: s.speaker, words: s.words, participation: s.participationPct }));
  const colors = ['#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Speaker Participation</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Bar dataKey="words" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Participation Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} dataKey="participation" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Detailed Stats</h3>
        {stats.map((s, i) => (
          <div key={s.speaker} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: colors[i % colors.length] }}>
              {s.speaker.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">{s.speaker}</p>
              <p className="text-xs text-slate-500">{s.words} words • {s.segments} contributions • {s.participationPct}% participation</p>
            </div>
            {i === 0 && <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Most active</span>}
          </div>
        ))}
        {participants.filter((p) => !stats.some((s) => s.speaker === p)).map((p) => (
          <div key={p} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-semibold">
              {p.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">{p}</p>
              <p className="text-xs text-slate-500">Did not speak</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AskAiTab({ meetingId, meetingTitle, transcriptText }: { meetingId: string; meetingTitle: string; transcriptText: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simple Q&A based on transcript
    setTimeout(() => {
      const lower = input.toLowerCase();
      let response = '';
      if (!transcriptText) {
        response = 'No transcript is available for this meeting. Please upload an audio recording first.';
      } else if (lower.includes('summary') || lower.includes('summarize')) {
        response = `Here's a summary of "${meetingTitle}":\n\n${transcriptText.split('.').slice(0, 5).join('. ')}.`;
      } else if (lower.includes('decision')) {
        const sentences = transcriptText.split(/(?<=[.!?])\s+/);
        const decisions = sentences.filter((s) => /\b(decided|agreed|concluded|approved|will go with|finalized)\b/i.test(s));
        response = decisions.length > 0
          ? `Key decisions from this meeting:\n\n${decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
          : 'No clear decisions were detected in this meeting transcript.';
      } else if (lower.includes('action') || lower.includes('task') || lower.includes('todo')) {
        const sentences = transcriptText.split(/(?<=[.!?])\s+/);
        const actions = sentences.filter((s) => /\b(will|should|need to|have to|must|please|complete|fix|finish|assign|deliver)\b/i.test(s));
        response = actions.length > 0
          ? `Potential action items identified:\n\n${actions.slice(0, 5).map((a, i) => `${i + 1}. ${a}`).join('\n')}`
          : 'No action items were detected. Check the Action Items tab for AI-extracted tasks.';
      } else {
        const sentences = transcriptText.split(/(?<=[.!?])\s+/);
        const relevant = sentences.filter((s) => s.toLowerCase().includes(lower.split(' ').find((w) => w.length > 4) || ''));
        response = relevant.length > 0
          ? `Here's what I found related to your question:\n\n${relevant.slice(0, 3).join('\n\n')}`
          : 'I couldn\'t find specific information about that in this meeting. Try asking about decisions, action items, or specific topics.';
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
        <Bot className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">Ask questions about this specific meeting. The AI will search the transcript for relevant answers.</p>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Ask anything about this meeting</p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {['Summarize this meeting', 'What decisions were made?', 'What are the action items?'].map((q) => (
                <button key={q} onClick={() => setInput(q)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 rounded-full transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-2.5 rounded-2xl">
              <Spinner className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about this meeting..."
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function UploadModal({ open, onClose, meetingId, onUploaded }: { open: boolean; onClose: () => void; meetingId: string; onUploaded: () => void }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processState, setProcessState] = useState<ProcessingState>({ stage: 'idle', message: '', progress: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handlePaste = async () => {
    if (!pastedText.trim()) {
      toast('Please paste a transcript', 'error');
      return;
    }
    setProcessing(true);
    setProcessState({ stage: 'analyzing', message: 'Analyzing transcript with AI...', progress: 50 });
    try {
      const lines = pastedText.split('\n').filter((l) => l.trim());
      const segments = lines.map((line, i) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          return { speaker: match[1].trim(), text: match[2].trim(), start: i * 10, end: (i + 1) * 10 };
        }
        return { speaker: 'Speaker', text: line.trim(), start: i * 10, end: (i + 1) * 10 };
      });

      const fullText = segments.map((s) => s.text).join(' ');
      const { error: txError } = await supabase.from('transcripts').upsert({
        meeting_id: meetingId,
        full_text: fullText,
        segments,
      });
      if (txError) throw new Error(`Failed to save transcript: ${txError.message}`);

      setProcessState({ stage: 'analyzing', message: 'Generating summary, action items, decisions, and topics...', progress: 75 });
      const { data: meeting } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .maybeSingle();
      await analyzeAndStoreMeeting(meetingId, segments, (meeting as Meeting)?.title || 'Meeting', (meeting as Meeting)?.participants || [], (meeting as Meeting)?.duration_minutes || 60);

      setProcessState({ stage: 'completed', message: 'Meeting analysis complete!', progress: 100 });
      toast('Transcript saved and analyzed successfully!', 'success');
      onUploaded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to process transcript';
      setProcessState({ stage: 'error', message: msg, progress: 0 });
      toast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = async (file: File) => {
    const validationError = validateRecordingFile(file);
    if (validationError) {
      toast(validationError, 'error');
      return;
    }
    setSelectedFile(file);
  };

  const startUpload = async () => {
    if (!selectedFile) {
      toast('Please select a recording file first', 'error');
      return;
    }
    setProcessing(true);
    setProcessState({ stage: 'uploading', message: 'Uploading recording...', progress: 10 });
    try {
      await uploadRecordingAndGetTranscript(meetingId, selectedFile, (state) => {
        setProcessState(state);
      });
      toast('Recording uploaded and analyzed successfully!', 'success');
      setSelectedFile(null);
      onUploaded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to process recording';
      setProcessState({ stage: 'error', message: msg, progress: 0 });
      toast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const resetState = () => {
    setProcessState({ stage: 'idle', message: '', progress: 0 });
    setSelectedFile(null);
    setPastedText('');
    setProcessing(false);
  };

  const stageSteps: { key: ProcessingState['stage']; label: string }[] = [
    { key: 'uploading', label: 'Uploading recording' },
    { key: 'transcribing', label: 'Generating transcript' },
    { key: 'analyzing', label: 'Analyzing meeting' },
    { key: 'completed', label: 'Completed' },
  ];

  const stageOrder = ['idle', 'uploading', 'transcribing', 'analyzing', 'completed', 'error'];
  const currentIdx = stageOrder.indexOf(processState.stage);

  return (
    <Modal open={open} onClose={() => { resetState(); onClose(); }} title="Upload Recorded Meeting" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('upload')}
            disabled={processing}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${mode === 'upload' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'} disabled:opacity-50`}
          >
            Upload Recording
          </button>
          <button
            onClick={() => setMode('paste')}
            disabled={processing}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${mode === 'paste' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'} disabled:opacity-50`}
          >
            Paste Transcript
          </button>
        </div>

        {mode === 'upload' ? (
          <>
            <p className="text-sm text-slate-500">
              Upload a recorded meeting audio or video file. Supported formats: MP3, WAV, M4A, MP4, WEBM. Maximum size: 100 MB.
            </p>

            {processState.stage === 'idle' || processState.stage === 'error' ? (
              <>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                  }}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors"
                >
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-2">Drag and drop a recording here, or</p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".mp3,.wav,.m4a,.mp4,.webm,.mov,.ogg,audio/*,video/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
                      Browse Files
                    </span>
                  </label>
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800 truncate">{selectedFile.name}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
                {processState.stage === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{processState.message}</p>
                  </div>
                )}
                {selectedFile && (
                  <button
                    onClick={startUpload}
                    disabled={processing}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upload and Analyze Recording
                  </button>
                )}
              </>
            ) : (
              <div className="py-6 space-y-4">
                <div className="space-y-3">
                  {stageSteps.map((step) => {
                    const stepIdx = stageOrder.indexOf(step.key);
                    const isDone = currentIdx > stepIdx;
                    const isActive = currentIdx === stepIdx;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDone ? 'bg-green-100 text-green-600' :
                          isActive ? 'bg-blue-100 text-blue-600' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> :
                           isActive ? <Spinner className="w-4 h-4" /> :
                           <div className="w-2 h-2 rounded-full bg-current" />}
                        </div>
                        <span className={`text-sm ${isDone || isActive ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">{processState.message}</span>
                    <span className="text-xs font-medium text-slate-600">{processState.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${processState.stage === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${processState.stage === 'error' ? 100 : processState.progress}%` }}
                    />
                  </div>
                </div>
                {processState.stage === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{processState.message}</p>
                  </div>
                )}
                {processState.stage === 'completed' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700">Meeting analysis complete! Summary, action items, decisions, and topics have been generated.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">Paste your meeting transcript below. Format: "Speaker Name: text" per line. The AI will automatically analyze it.</p>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={10}
              placeholder="Arun Sharma: Welcome to the meeting.&#10;Rahul Verma: I will complete the API by Friday.&#10;..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
            {processState.stage === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{processState.message}</p>
              </div>
            )}
            {processState.stage === 'completed' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700">Transcript saved and analyzed successfully!</p>
              </div>
            )}
            <button
              onClick={handlePaste}
              disabled={processing || !pastedText.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {processing ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {processing ? 'Analyzing...' : 'Save and Analyze Transcript'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function AddTaskModal({ open, onClose, meetingId, onAdded }: { open: boolean; onClose: () => void; meetingId: string; onAdded: (task: ActionItem) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: '', owner: '', deadline: '', priority: 'medium' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { toast('Please enter a task description', 'error'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('action_items').insert({
        meeting_id: meetingId,
        description: form.description,
        owner: form.owner || 'Unassigned',
        deadline: form.deadline || null,
        priority: form.priority,
        status: 'pending',
        ai_generated: false,
      }).select('*').maybeSingle();
      if (error) throw error;
      if (data) onAdded(data as ActionItem);
      setForm({ description: '', owner: '', deadline: '', priority: 'medium' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to add task', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Action Item" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Task Description *</label>
          <input
            type="text"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="e.g., Complete API documentation"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner</label>
            <input
              type="text"
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Assignee name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2">
            {saving ? <Spinner className="w-4 h-4" /> : null} Add Task
          </button>
        </div>
      </form>
    </Modal>
  );
}
