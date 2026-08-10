import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, ErrorState, EmptyState } from '@/components/ui/States';
import { ConfirmDialog } from '@/components/ui/Modal';
import {
  Bell, CheckCheck, Trash2, Clock, AlertTriangle, CalendarDays,
  CheckSquare, MessageSquare, Info
} from 'lucide-react';
import { relativeTime } from '@/lib/utils';
import type { Notification } from '@/types';

const typeIcons: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  task_reminder: { icon: Clock, color: 'amber' },
  deadline_reminder: { icon: AlertTriangle, color: 'orange' },
  overdue: { icon: AlertTriangle, color: 'red' },
  meeting_reminder: { icon: CalendarDays, color: 'blue' },
  meeting_starting: { icon: CalendarDays, color: 'cyan' },
  task_assigned: { icon: CheckSquare, color: 'green' },
  follow_up: { icon: MessageSquare, color: 'blue' },
  info: { icon: Info, color: 'slate' },
};

const colorMap: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  green: 'bg-green-50 text-green-600',
  slate: 'bg-slate-50 text-slate-600',
};

export function NotificationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast('All notifications marked as read', 'success');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('notifications').delete().eq('id', deleteId);
    setNotifications((prev) => prev.filter((n) => n.id !== deleteId));
    setDeleteId(null);
    toast('Notification deleted', 'success');
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState description={error} onRetry={loadNotifications} />;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon={Bell} title="No notifications" description="You'll see task reminders, meeting alerts, and deadline notifications here." />
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const typeInfo = typeIcons[n.type] || typeIcons.info;
            const Icon = typeInfo.icon;
            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border p-4 transition-colors ${
                  n.read ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[typeInfo.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{relativeTime(n.created_at)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.read && (
                      <button onClick={() => handleMarkRead(n.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Mark as read">
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setDeleteId(n.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete notification?" message="This action cannot be undone." confirmLabel="Delete" danger />
    </div>
  );
}
