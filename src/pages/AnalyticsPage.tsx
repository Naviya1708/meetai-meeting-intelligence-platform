import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageLoader, ErrorState, EmptyState } from '@/components/ui/States';
import { BarChart3, CalendarDays, Clock, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { daysUntil, formatDate } from '@/lib/utils';
import type { Meeting, ActionItem } from '@/types';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [view, setView] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [m, t] = await Promise.all([
        supabase.from('meetings').select('*').order('meeting_date', { ascending: false }),
        supabase.from('action_items').select('*').order('created_at', { ascending: false }),
      ]);
      if (m.error) throw m.error;
      if (t.error) throw t.error;
      setMeetings((m.data || []) as Meeting[]);
      setTasks((t.data || []) as ActionItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState description={error} onRetry={loadData} />;

  // Filter by view
  const now = new Date();
  const days = view === 'week' ? 7 : view === 'month' ? 30 : 365;
  const cutoff = new Date(now.getTime() - days * 86400000);
  const filteredMeetings = view === 'all' ? meetings : meetings.filter((m) => new Date(m.meeting_date) >= cutoff);
  const filteredTasks = view === 'all' ? tasks : tasks.filter((t) => new Date(t.created_at) >= cutoff);

  // Stats
  const totalMeetings = filteredMeetings.length;
  const totalHours = filteredMeetings.reduce((s, m) => s + (m.duration_minutes || 0), 0) / 60;
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const overdueTasks = filteredTasks.filter((t) => t.deadline && t.status !== 'completed' && daysUntil(t.deadline) < 0).length;
  const completionRate = filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;

  // Weekly/monthly meetings chart
  const trendData = [...Array(view === 'week' ? 7 : view === 'month' ? 4 : 6)].map((_, i) => {
    const start = new Date(now);
    if (view === 'week') start.setDate(now.getDate() - (6 - i));
    else if (view === 'month') start.setDate(now.getDate() - (3 - i) * 7);
    else start.setMonth(now.getMonth() - (5 - i));

    const end = new Date(start);
    if (view === 'week') end.setDate(start.getDate() + 1);
    else if (view === 'month') end.setDate(start.getDate() + 7);
    else end.setMonth(start.getMonth() + 1);

    const count = meetings.filter((m) => {
      const d = new Date(m.meeting_date);
      return d >= start && d < end;
    }).length;
    const completed = tasks.filter((t) => {
      const d = new Date(t.updated_at || t.created_at);
      return d >= start && d < end && t.status === 'completed';
    }).length;

    return {
      label: view === 'week' ? start.toLocaleDateString('en-US', { weekday: 'short' }) :
        view === 'month' ? `Week ${i + 1}` : start.toLocaleDateString('en-US', { month: 'short' }),
      meetings: count,
      completed,
    };
  });

  // Task status distribution
  const taskStatusData = [
    { name: 'Pending', value: filteredTasks.filter((t) => t.status === 'pending').length, color: '#f59e0b' },
    { name: 'In Progress', value: filteredTasks.filter((t) => t.status === 'in_progress').length, color: '#3b82f6' },
    { name: 'Completed', value: completedTasks, color: '#22c55e' },
    { name: 'Overdue', value: overdueTasks, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  // Duration trend
  const durationData = filteredMeetings.slice(0, 10).reverse().map((m) => ({
    name: m.title.substring(0, 12) + (m.title.length > 12 ? '...' : ''),
    duration: m.duration_minutes || 0,
  }));

  // Priority distribution
  const priorityData = [
    { name: 'Critical', value: filteredTasks.filter((t) => t.priority === 'critical').length, color: '#ef4444' },
    { name: 'High', value: filteredTasks.filter((t) => t.priority === 'high').length, color: '#f97316' },
    { name: 'Medium', value: filteredTasks.filter((t) => t.priority === 'medium').length, color: '#eab308' },
    { name: 'Low', value: filteredTasks.filter((t) => t.priority === 'low').length, color: '#22c55e' },
  ].filter((d) => d.value > 0);

  // Productivity score
  const efficiencyScore = totalMeetings > 0 ? Math.round((completedTasks / Math.max(totalMeetings, 1)) * 10) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track meeting productivity and task performance.</p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['week', 'month', 'all'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${view === v ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {v === 'all' ? 'All Time' : v === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={CalendarDays} label="Total Meetings" value={totalMeetings} color="blue" />
        <StatCard icon={Clock} label="Total Hours" value={totalHours.toFixed(1)} color="cyan" />
        <StatCard icon={CheckSquare} label="Completion Rate" value={`${completionRate}%`} color="green" />
        <StatCard icon={TrendingUp} label="Completed Tasks" value={completedTasks} color="green" />
        <StatCard icon={AlertTriangle} label="Pending Tasks" value={pendingTasks} color="amber" />
        <StatCard icon={AlertTriangle} label="Overdue Tasks" value={overdueTasks} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meeting & task trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Meeting & Task Completion Trend</h3>
          {trendData.some((d) => d.meetings > 0 || d.completed > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="meetings" stroke="#3b82f6" strokeWidth={2} fill="url(#colorMeetings)" />
                <Area type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">No data for this period</div>
          )}
        </div>

        {/* Task status pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Status Distribution</h3>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label>
                  {taskStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">No tasks in this period</div>
          )}
        </div>

        {/* Duration trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Meeting Duration Trend</h3>
          {durationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={durationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="duration" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">No meetings in this period</div>
          )}
        </div>

        {/* Priority distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Priority Distribution</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">No tasks in this period</div>
          )}
        </div>
      </div>

      {/* Productivity score */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5" />
          <h3 className="text-sm font-semibold">Productivity Intelligence</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-3xl font-bold">{completionRate}%</p>
            <p className="text-xs text-slate-300 mt-1">Task Completion Rate</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-slate-300 mt-1">Total Meeting Hours</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{efficiencyScore}</p>
            <p className="text-xs text-slate-300 mt-1">Tasks per Meeting</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{overdueTasks}</p>
            <p className="text-xs text-slate-300 mt-1">Overdue Tasks</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">These metrics are calculated transparently from your meeting and task data. They are not a definitive measure of individual performance.</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', cyan: 'bg-cyan-50 text-cyan-600',
    green: 'bg-green-50 text-green-600', amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
