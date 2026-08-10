import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { semanticSearch, generateRagAnswer } from '@/lib/ai-engine';
import { PageLoader, EmptyState, Spinner } from '@/components/ui/States';
import { Search, FileText, CalendarDays, Sparkles, Send, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SearchResult {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  snippet: string;
  score: number;
}

export function KnowledgeSearchPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [meetingsData, setMeetingsData] = useState<{ id: string; title: string; meeting_date: string; participants: string[]; transcript_text: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: meetings, error: mError } = await supabase.from('meetings').select('id, title, meeting_date, participants').order('meeting_date', { ascending: false });
      if (mError) throw mError;
      const { data: transcripts, error: tError } = await supabase.from('transcripts').select('meeting_id, full_text');
      if (tError) throw tError;
      const transcriptMap = new Map<string, string>();
      for (const t of transcripts || []) transcriptMap.set(t.meeting_id, t.full_text);
      setMeetingsData((meetings || []).map((m) => ({ ...m, transcript_text: transcriptMap.get(m.id) || '' })));
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setHasSearched(true);

    // Simulate RAG retrieval with semantic search
    setTimeout(() => {
      const searchResults = semanticSearch(query, meetingsData);
      setResults(searchResults);
      const ragAnswer = generateRagAnswer(query, searchResults);
      setAnswer(ragAnswer);
      setSearching(false);
    }, 600);
  };

  const suggestedQueries = [
    'What did we decide about the API?',
    'When did we discuss the login module?',
    'Which meeting discussed the payment integration?',
    'Who was assigned the UI task?',
    'What problems were mentioned repeatedly?',
  ];

  if (loading) return <PageLoader />;

  const meetingsWithTranscripts = meetingsData.filter((m) => m.transcript_text);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Knowledge Search</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search across all your meeting transcripts using AI-powered semantic retrieval.</p>
      </div>

      {meetingsWithTranscripts.length === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">No transcripts available yet</p>
            <p className="text-xs text-blue-600 mt-0.5">Upload audio or paste transcripts for your meetings to enable semantic search across your meeting history.</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask anything about your past meetings..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button onClick={handleSearch} disabled={searching || !query.trim()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2">
            {searching ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            Search
          </button>
        </div>

        {!hasSearched && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-2">Try these questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((q) => (
                <button key={q} onClick={() => { setQuery(q); }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 rounded-full transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          {/* AI Answer */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">AI Answer</h3>
            </div>
            {searching ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Spinner className="w-4 h-4" /> Searching across meeting transcripts...
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{answer}</p>
            )}
          </div>

          {/* Source meetings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Source Meetings</h3>
            {results.length === 0 && !searching ? (
              <div className="bg-white rounded-2xl border border-slate-200">
                <EmptyState icon={Search} title="No results found" description="Try rephrasing your query or ensure meetings have transcripts." />
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result, i) => (
                  <Link key={result.meetingId} to={`/app/meetings/${result.meetingId}`} className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-slate-800 truncate">{result.meetingTitle}</h4>
                          <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                            <CalendarDays className="w-3 h-3" /> {formatDate(result.meetingDate)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg mt-1">"{result.snippet}"</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">Relevance: {result.score}</span>
                          <span className="text-xs text-blue-600 flex items-center gap-1">View meeting <ArrowRight className="w-3 h-3" /></span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
