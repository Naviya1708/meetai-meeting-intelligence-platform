import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageLoader, ErrorState, EmptyState } from '@/components/ui/States';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, CheckSquare } from 'lucide-react';
import { formatDate, formatTime, statusColor, formatStatus, daysUntil } from '@/lib/utils';
import type { Meeting, ActionItem } from '@/types';

export function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [m, t] = await Promise.all([
        supabase.from('meetings').select('*').order('meeting_date', { ascending: true }),
        supabase.from('action_items').select('*').eq('status', 'pending'),
      ]);
      if (m.error) throw m.error;
      if (t.error) throw t.error;
      setMeetings((m.data || []) as Meeting[]);
      setTasks((t.data || []) as ActionItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState description={error} onRetry={loadData} />;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const monthDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) monthDays.push(null);
  for (let i = 1; i <= totalDays; i++) monthDays.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayMeetings = meetings.filter((m) => m.meeting_date === dateStr);
    const dayTasks = tasks.filter((t) => t.deadline === dateStr);
    return { meetings: dayMeetings, tasks: dayTasks };
  };

  const upcomingEvents = [
    ...meetings.filter((m) => new Date(m.meeting_date) >= new Date()).map((m) => ({ type: 'meeting', date: m.meeting_date, title: m.title, time: m.start_time, id: m.id, status: m.status })),
    ...tasks.filter((t) => t.deadline && new Date(t.deadline) >= new Date()).map((t) => ({ type: 'task', date: t.deadline!, title: t.description, time: '', id: t.id, status: t.status })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">View your meetings and task deadlines in one calendar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Today
              </button>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, i) => {
              if (day === null) return <div key={i} />;
              const { meetings: dayMeetings, tasks: dayTasks } = getEventsForDay(day);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const hasEvents = dayMeetings.length > 0 || dayTasks.length > 0;

              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-1.5 rounded-lg border transition-colors ${
                    isToday ? 'border-blue-300 bg-blue-50' : hasEvents ? 'border-slate-200 bg-slate-50' : 'border-slate-100'
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>{day}</p>
                  {dayMeetings.slice(0, 2).map((m) => (
                    <Link key={m.id} to={`/app/meetings/${m.id}`} className="block text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded mb-0.5 truncate hover:bg-blue-200 transition-colors">
                      {m.title}
                    </Link>
                  ))}
                  {dayTasks.slice(0, 1).map((t) => (
                    <div key={t.id} className="block text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded mb-0.5 truncate">
                      Task: {t.description.substring(0, 15)}
                    </div>
                  ))}
                  {(dayMeetings.length > 2 || dayTasks.length > 1) && (
                    <p className="text-[10px] text-slate-400">+{dayMeetings.length - 2 + Math.max(0, dayTasks.length - 1)} more</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming events sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Upcoming Events</h3>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {upcomingEvents.map((event) => (
                event.type === 'meeting' ? (
                  <Link key={`m-${event.id}`} to={`/app/meetings/${event.id}`} className="block p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
                        <p className="text-xs text-slate-500">{formatDate(event.date)} {event.time && `• ${formatTime(event.time)}`}</p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div key={`t-${event.id}`} className="p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckSquare className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
                        <p className="text-xs text-slate-500">Due {formatDate(event.date)} ({daysUntil(event.date)}d)</p>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <EmptyState icon={Calendar} title="No upcoming events" description="Schedule meetings or set task deadlines to see them here." />
          )}
        </div>
      </div>
    </div>
  );
}
