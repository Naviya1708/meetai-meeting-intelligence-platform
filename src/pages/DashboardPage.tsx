import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { seedDemoData } from '@/lib/demo-data';
import { predictDeadlineRisk } from '@/lib/ai-engine';
import { CardSkeleton, EmptyState, ErrorState, PageLoader } from '@/components/ui/States';
import {
  CalendarDays, Clock, CheckSquare, AlertTriangle, TrendingUp,
  Bot, ArrowRight, Users, FileText, Sparkles, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatDate, relativeTime, priorityColor, statusColor, formatStatus, daysUntil } from '@/lib/utils';
import type { Meeting, ActionItem, AiInsight } from '@/types';

export function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // First check if user has a profile name, if not set it
      if (profile && !profile.full_name) {
        const meta = user.user_metadata;
        if (meta?.full_name) {
          await supabase.from('profiles').update({ full_name: meta.full_name }).eq('id', user.id);
          refreshProfile();
        }
      }

      // Check if user has any meetings
      const { data: userMeetings } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if ((!userMeetings || userMeetings.length === 0) && !seeding) {
        // Seed demo data
        setSeeding(true);
        const seeded = await seedDemoData(user.id);
        setSeeding(false);
        if (seeded) {
          toast('Demo data loaded! Explore the platform with sample meetings.', 'success');
        }
      }

      // Load all data
      const [meetingsRes, tasksRes, insightsRes] = await Promise.all([
        supabase.from('meetings').select('*').order('meeting_date', { ascending: false }),
        supabase.from('action_items').select('*, meetings(title)').order('created_at', { ascending: false }),
        supabase.from('ai_insights').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      if (meetingsRes.error) throw meetingsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (insightsRes.error) throw insightsRes.error;

      setMeetings((meetingsRes.data || []) as Meeting[]);
      setActionItems((tasksRes.data || []) as unknown as ActionItem[]);
      setInsights((insightsRes.data || []) as AiInsight[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading || seeding) {
    return (
      <div>
        {seeding && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Loading demo data for first-run experience...
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error} onRetry={loadData} />;
  }

  // Compute stats
  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter((m) => m.status === 'completed').length;
  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled' && new Date(m.meeting_date) >= new Date());
  const totalHours = meetings.reduce((sum, m) => sum + (m.duration_minutes || 0), 0) / 60;

  const pendingTasks = actionItems.filter((t) => t.status === 'pending');
  const inProgressTasks = actionItems.filter((t) => t.status === 'in_progress');
  const completedTasks = actionItems.filter((t) => t.status === 'completed');
  const overdueTasks = actionItems.filter((t) => {
    if (t.status === 'completed' || !t.deadline) return false;
    return daysUntil(t.deadline) < 0;
  });
  const completionRate = actionItems.length > 0
    ? Math.round((completedTasks.length / actionItems.length) * 100)
    : 0;

  // Chart data — weekly meeting trend
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = meetings.filter((m) => m.meeting_date === dateStr).length;
    return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), meetings: count };
  });

  // Task status distribution
  const taskStatusData = [
    { name: 'Pending', value: pendingTasks.length, color: '#f59e0b' },
    { name: 'In Progress', value: inProgressTasks.length, color: '#3b82f6' },
    { name: 'Completed', value: completedTasks.length, color: '#22c55e' },
    { name: 'Overdue', value: overdueTasks.length, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  // Meeting duration trend
  const recentMeetings = meetings.slice(0, 6).reverse();
  const durationData = recentMeetings.map((m) => ({
    name: m.title.substring(0, 15) + (m.title.length > 15 ? '...' : ''),
    duration: m.duration_minutes || 0,
  }));

  // Task completion trend (last 7 days)
  const completionTrend = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const completed = actionItems.filter((t) =>
      t.status === 'completed' && t.updated_at?.startsWith(dateStr)
    ).length;
    return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), completed };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back, {profile?.full_name || 'User'}. Here's your meeting intelligence overview.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/meetings')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          New Meeting <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Total Meetings" value={totalMeetings} sub={`${completedMeetings} completed`} color="blue" />
        <StatCard icon={Clock} label="Meeting Hours" value={totalHours.toFixed(1)} sub="hours total" color="cyan" />
        <StatCard icon={CheckSquare} label="Pending Tasks" value={pendingTasks.length + inProgressTasks.length} sub={`${completedTasks.length} completed`} color="amber" />
        <StatCard icon={TrendingUp} label="Completion Rate" value={`${completionRate}%`} sub={`${overdueTasks.length} overdue`} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly meeting trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Weekly Meeting Trend</h3>
          {last7Days.some((d) => d.meetings > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="meetings" stroke="#3b82f6" strokeWidth={2} fill="url(#colorMeetings)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No meetings this week yet</div>
          )}
        </div>

        {/* Task status distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Status Distribution</h3>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {taskStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No tasks yet</div>
          )}
        </div>

        {/* Meeting duration trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Meeting Duration Trend</h3>
          {durationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={durationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="duration" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No meetings yet</div>
          )}
        </div>

        {/* Task completion trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Completion Trend</h3>
          {completionTrend.some((d) => d.completed > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="completed" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No completed tasks this week</div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">AI Insights & Recommendations</h3>
        </div>
        {insights.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {insights.map((insight) => (
              <div key={insight.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    insight.severity === 'critical' ? 'bg-red-50' :
                    insight.severity === 'warning' ? 'bg-orange-50' : 'bg-blue-50'
                  }`}>
                    <AlertCircle className={`w-4 h-4 ${
                      insight.severity === 'critical' ? 'text-red-600' :
                      insight.severity === 'warning' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{insight.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No AI insights generated yet. Analyze a meeting to get intelligent recommendations.</p>
        )}
      </div>

      {/* Upcoming meetings + Pending tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Meetings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Upcoming Meetings</h3>
            <Link to="/app/upcoming" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          </div>
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-3">
              {upcomingMeetings.slice(0, 4).map((m) => (
                <Link key={m.id} to={`/app/meetings/${m.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                    <p className="text-xs text-slate-500">{formatDate(m.meeting_date)} • {m.start_time}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusColor(m.status)}`}>
                    {formatStatus(m.status)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No upcoming meetings" description="Schedule a meeting to get started." />
          )}
        </div>

        {/* My Pending Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">My Pending Tasks</h3>
            <Link to="/app/action-items" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          </div>
          {(pendingTasks.length > 0 || inProgressTasks.length > 0) ? (
            <div className="space-y-3">
              {[...pendingTasks, ...inProgressTasks].slice(0, 5).map((task) => {
                const risk = predictDeadlineRisk(task);
                return (
                  <Link key={task.id} to={task.meeting_id ? `/app/meetings/${task.meeting_id}` : '/app/action-items'} className="block p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        risk.risk === 'high' ? 'bg-red-500' : risk.risk === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{task.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className="text-xs text-slate-400">
                            {task.deadline ? `Due ${formatDate(task.deadline)}` : 'No deadline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={CheckSquare} title="No pending tasks" description="All caught up! Create or analyze meetings to generate tasks." />
          )}
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Recent Meetings</h3>
          <Link to="/app/meetings" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
        </div>
        {meetings.length > 0 ? (
          <div className="space-y-2">
            {meetings.slice(0, 5).map((m) => (
              <Link key={m.id} to={`/app/meetings/${m.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                  <p className="text-xs text-slate-500">{formatDate(m.meeting_date)} • {m.duration_minutes} min • {m.participants?.length || 0} participants</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${statusColor(m.status)}`}>
                  {formatStatus(m.status)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No meetings yet" description="Create your first meeting to get started." />
        )}
      </div>

      {/* AI Assistant shortcut */}
      <Link to="/app/assistant" className="block bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">Ask the AI Assistant</h3>
            <p className="text-sm text-slate-300">Get instant answers about your meetings, tasks, and decisions.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70" />
        </div>
      </Link>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  color: 'blue' | 'cyan' | 'amber' | 'green';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
