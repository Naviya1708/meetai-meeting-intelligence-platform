import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/States';
import { User, Bell, Calendar, Brain, Lock, LogOut, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const { profile, updateProfile, signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  const [name, setName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [prefs, setPrefs] = useState({
    email_notifications: profile?.preferences?.email_notifications ?? true,
    task_reminders: profile?.preferences?.task_reminders ?? true,
    meeting_reminders: profile?.preferences?.meeting_reminders ?? true,
    deadline_alerts: profile?.preferences?.deadline_alerts ?? true,
    timezone: profile?.preferences?.timezone || 'UTC',
    summary_style: profile?.preferences?.summary_style || 'balanced',
    summary_length: profile?.preferences?.summary_length || 'medium',
    ai_language: profile?.preferences?.ai_language || 'en',
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: name, avatar_url: avatarUrl });
    setSaving(false);
    if (error) toast(error, 'error');
    else toast('Profile updated', 'success');
  };

  const handleSavePrefs = async (key: string, value: string | boolean) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);
    const { error } = await updateProfile({ preferences: newPrefs });
    setSaving(false);
    if (error) toast(error, 'error');
    else toast('Preferences saved', 'success');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sections = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'ai', label: 'AI Preferences', icon: Brain },
    { key: 'account', label: 'Account', icon: Lock },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Section nav */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6">
          {activeSection === 'profile' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold text-slate-800">Profile Settings</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Avatar URL</label>
                <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                <input type="text" value={profile?.role || 'user'} disabled className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 capitalize" />
              </div>
              <button onClick={handleSaveProfile} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                {saving ? <Spinner className="w-4 h-4" /> : null} Save Changes
              </button>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold text-slate-800">Notification Preferences</h2>
              {[
                { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                { key: 'task_reminders', label: 'Task Reminders', desc: 'Get reminded about upcoming task deadlines' },
                { key: 'meeting_reminders', label: 'Meeting Reminders', desc: 'Get notified before scheduled meetings' },
                { key: 'deadline_alerts', label: 'Deadline Alerts', desc: 'Receive alerts for overdue tasks' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => handleSavePrefs(item.key, !prefs[item.key as keyof typeof prefs])}
                    className={`relative w-11 h-6 rounded-full transition-colors ${prefs[item.key as keyof typeof prefs] ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${prefs[item.key as keyof typeof prefs] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'calendar' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold text-slate-800">Calendar Settings</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
                <select value={prefs.timezone} onChange={(e) => handleSavePrefs('timezone', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                </select>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm font-medium text-blue-800 mb-1">Google Calendar Integration</p>
                <p className="text-xs text-blue-600">Connect your Google Calendar to sync meetings automatically. This feature is architecturally ready — connect your Google account in production to enable two-way sync.</p>
              </div>
            </div>
          )}

          {activeSection === 'ai' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold text-slate-800">AI Preferences</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Summary Style</label>
                <select value={prefs.summary_style} onChange={(e) => handleSavePrefs('summary_style', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Summary Length</label>
                <select value={prefs.summary_length} onChange={(e) => handleSavePrefs('summary_length', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">AI Language</label>
                <select value={prefs.ai_language} onChange={(e) => handleSavePrefs('ai_language', e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="hi">Hindi</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold text-slate-800">Account Settings</h2>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-medium text-slate-800 mb-1">Change Password</p>
                <p className="text-xs text-slate-500 mb-3">Use the forgot password flow to reset your password via email.</p>
                <button onClick={() => navigate('/forgot-password')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Reset password →</button>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-medium text-slate-800 mb-1">Sign Out</p>
                <p className="text-xs text-slate-500 mb-3">Sign out of your account on this device.</p>
                <button onClick={handleSignOut} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-medium text-red-800 mb-1 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Account</p>
                <p className="text-xs text-red-600 mb-3">Permanently delete your account and all associated data. This cannot be undone.</p>
                <button onClick={() => toast('Account deletion requires admin verification. Contact support.', 'info')} className="text-sm text-red-600 hover:text-red-700 font-medium">Delete account →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
