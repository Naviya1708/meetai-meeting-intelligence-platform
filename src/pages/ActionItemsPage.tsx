import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { predictDeadlineRisk } from '@/lib/ai-engine';
import { PageLoader, EmptyState, ErrorState } from '@/components/ui/States';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { formatDate, priorityColor, statusColor, formatStatus, daysUntil } from '@/lib/utils';
import type { ActionItem } from '@/types';
import {
  CheckSquare, Search, Plus, Trash2, User, CalendarDays,
  AlertTriangle, Clock, TrendingUp, Filter, ChevronDown, Sparkles
} from 'lucide-react';

export function ActionItemsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('action_items')
        .select('*, meetings(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []) as unknown as ActionItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load action items');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (item: ActionItem) => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('action_items').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', item.id);
    setItems((prev) => prev.map((a) => a.id === item.id ? { ...a, status: newStatus as ActionItem['status'] } : a));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('action_items').delete().eq('id', deleteId);
    setItems((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
    toast('Task deleted', 'success');
  };

  const filtered = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    if (search && !item.description.toLowerCase().includes(search.toLowerCase()) && !item.owner.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    inProgress: items.filter((i) => i.status === 'in_progress').length,
    completed: items.filter((i) => i.status === 'completed').length,
    overdue: items.filter((i) => i.deadline && i.status !== 'completed' && daysUntil(i.deadline) < 0).length,
    highRisk: items.filter((i) => i.status !== 'completed' && predictDeadlineRisk(i).risk === 'high').length,
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState description={error} onRetry={loadItems} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Action Items</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage all your tasks in one place.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox label="Total" value={stats.total} icon={CheckSquare} color="blue" />
        <StatBox label="Pending" value={stats.pending} icon={Clock} color="amber" />
        <StatBox label="In Progress" value={stats.inProgress} icon={TrendingUp} color="cyan" />
        <StatBox label="Completed" value={stats.completed} icon={CheckSquare} color="green" />
        <StatBox label="Overdue" value={stats.overdue} icon={AlertTriangle} color="red" />
        <StatBox label="High Risk" value={stats.highRisk} icon={AlertTriangle} color="orange" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={CheckSquare} title="No action items" description="Create a task or analyze a meeting to generate action items automatically." action={
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          } />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const risk = predictDeadlineRisk(item);
            const meetingTitle = (item as unknown as { meetings?: { title: string } }).meetings?.title;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.status === 'completed'}
                    onChange={() => toggleStatus(item)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {item.owner}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(item.priority)}`}>{item.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(item.status)}`}>{formatStatus(item.status)}</span>
                      {item.deadline && (
                        <span className={`text-xs flex items-center gap-1 ${daysUntil(item.deadline) < 0 && item.status !== 'completed' ? 'text-red-600' : 'text-slate-500'}`}>
                          <CalendarDays className="w-3 h-3" /> {formatDate(item.deadline)} ({daysUntil(item.deadline)}d)
                        </span>
                      )}
                      {item.ai_generated && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI
                        </span>
                      )}
                      {item.meeting_id && meetingTitle && (
                        <Link to={`/app/meetings/${item.meeting_id}`} className="text-xs text-blue-600 hover:text-blue-700">
                          {meetingTitle}
                        </Link>
                      )}
                    </div>
                    {risk.risk !== 'low' && item.status !== 'completed' && (
                      <div className={`mt-2 flex items-start gap-1.5 text-xs ${risk.risk === 'high' ? 'text-red-600' : 'text-orange-600'}`}>
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{risk.explanation}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        await supabase.from('action_items').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', item.id);
                        setItems((prev) => prev.map((a) => a.id === item.id ? { ...a, status: newStatus as ActionItem['status'] } : a));
                      }}
                      className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={(task) => { setItems((prev) => [task, ...prev]); setAddOpen(false); toast('Task added', 'success'); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete task?" message="This action cannot be undone." confirmLabel="Delete" danger />
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600', green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function AddTaskModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (task: ActionItem) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: '', owner: '', deadline: '', priority: 'medium' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { toast('Please enter a task description', 'error'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('action_items').insert({
        description: form.description,
        owner: form.owner || 'Unassigned',
        deadline: form.deadline || null,
        priority: form.priority,
        status: 'pending',
        ai_generated: false,
      }).select('*').maybeSingle();
      if (error) throw error;
      if (data) {
        onAdded(data as ActionItem);
        setForm({ description: '', owner: '', deadline: '', priority: 'medium' });
      }
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
          <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="e.g., Complete API documentation" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner</label>
            <input type="text" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Assignee name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60">Add Task</button>
        </div>
      </form>
    </Modal>
  );
}
