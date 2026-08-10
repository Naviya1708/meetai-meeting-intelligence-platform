import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageLoader, ErrorState, EmptyState } from '@/components/ui/States';
import { CalendarClock, ArrowRight, Clock, Users } from 'lucide-react';
import { formatDate, formatTime, statusColor, formatStatus } from '@/lib/utils';
import type { Meeting } from '@/types';

export function UpcomingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => { loadMeetings(); }, []);

  const loadMeetings = async () => {
    try {
      const { data, error } = await supabase.from('meetings').select('*').order('meeting_date', { ascending: true });
      if (error) throw error;
      setMeetings((data || []) as Meeting[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState description={error} onRetry={loadMeetings} />;

  const upcoming = meetings.filter((m) => m.status === 'scheduled' && new Date(m.meeting_date) >= new Date());
  const past = meetings.filter((m) => m.status === 'scheduled' && new Date(m.meeting_date) < new Date());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upcoming Meetings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your scheduled meetings and their details.</p>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={CalendarClock} title="No upcoming meetings" description="Schedule a meeting from the Meetings page to see it here." action={
            <Link to="/app/meetings" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              Go to Meetings <ArrowRight className="w-4 h-4" />
            </Link>
          } />
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <Link key={m.id} to={`/app/meetings/${m.id}`} className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-blue-600 font-medium">{new Date(m.meeting_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-blue-700">{new Date(m.meeting_date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{m.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(m.start_time)}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {m.participants?.length || 0}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColor(m.status)}`}>{formatStatus(m.status)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Past Scheduled</h2>
              <div className="space-y-2">
                {past.map((m) => (
                  <Link key={m.id} to={`/app/meetings/${m.id}`} className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-all opacity-70">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-slate-500 font-medium">{new Date(m.meeting_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-slate-600">{new Date(m.meeting_date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-700 truncate">{m.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{formatDate(m.meeting_date)} • {formatTime(m.start_time)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
