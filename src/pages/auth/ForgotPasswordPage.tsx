import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/States';
import { Mic, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      setSent(true);
      toast('Password reset link sent to your email', 'success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">MeetAI</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 mb-2">Check your email</h1>
              <p className="text-sm text-slate-500 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Follow the link to reset your password.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-800 mb-2">Forgot password?</h1>
              <p className="text-sm text-slate-500 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Spinner className="w-4 h-4" /> : <>Send reset link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="text-center text-sm text-slate-500 mt-6">
                Remembered your password?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
