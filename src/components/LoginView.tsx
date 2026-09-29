import React, { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, FileText, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { UserSession } from '../services/storage';

interface LoginViewProps {
  onLogin: (user: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('reset') === '1' || hashParams.get('type') === 'recovery') setMode('reset');
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to sign in');
        onLogin(result.user as UserSession);
      } else if (mode === 'forgot') {
        const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to request password reset');
        setMessage(result.message);
      } else {
        if (password !== confirmation) throw new Error('Passwords do not match');
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: hashParams.get('access_token') || '', password }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to reset password');
        onLogin(result.user as UserSession);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLogin = mode === 'login';
  const isReset = mode === 'reset';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">SmartBill</p>
            <p className="text-xs text-slate-500">GST invoicing and inventory</p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">{isLogin ? 'Welcome back' : isReset ? 'Set a new password' : 'Forgot password'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isLogin ? 'Sign in to access your business dashboard.' : isReset ? 'Choose a new password for your account.' : 'Enter your account email and we will send a reset link.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isReset && <label className="block text-sm font-semibold text-slate-700">
            Email
            <span className="relative mt-1 block">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </span>
          </label>}

          <label className="block text-sm font-semibold text-slate-700">
            {isReset ? 'New password' : 'Password'}
            <span className="relative mt-1 block">
              {isReset ? <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /> : <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />}
              <input
                type="password"
                required
                minLength={isReset ? 8 : undefined}
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </span>
          </label>

          {isReset && <label className="block text-sm font-semibold text-slate-700">
            Confirm new password
            <input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </label>}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLogin ? 'Sign in' : isReset ? 'Update password' : 'Send reset link'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 flex justify-between text-xs font-semibold text-emerald-700">
          {isLogin ? <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}>Forgot password?</button> : <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Back to sign in</button>}
        </div>
      </section>
    </main>
  );
};
