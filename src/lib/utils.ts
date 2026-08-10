export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatDateTime(dateStr: string, timeStr: string) {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`;
}

export function relativeTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 7) return formatDate(d);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function daysUntil(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function priorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function statusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700 border-green-200';
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
    case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'in_progress_meeting': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'cancelled': return 'bg-gray-100 text-gray-500 border-gray-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function formatStatus(status: string) {
  return status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function generateMeetingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `${id.slice(0, 3)}-${id.slice(3, 7)}-${id.slice(7)}`;
}
