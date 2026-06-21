'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, Lock, Mail } from 'lucide-react';

type View = 'login' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('login');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot state
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg('');
    setForgotError('');
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST' });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setForgotMsg(d.message);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto">
            {view === 'login' ? <Lock className="w-6 h-6 text-zinc-300" /> : <Mail className="w-6 h-6 text-zinc-300" />}
          </div>
          <h1 className="text-xl font-bold text-zinc-100">
            {view === 'login' ? 'Institute Portal' : 'Reset Password'}
          </h1>
          <p className="text-sm text-zinc-500">
            {view === 'login' ? 'Sign in to continue' : 'We\'ll send credentials to your recovery email'}
          </p>
        </div>

        {/* ── Login form ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            {error && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toUpperCase())}
                required autoFocus autoComplete="username"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono uppercase tracking-wider"
                placeholder="ADMIN"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 font-semibold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
            <button type="button" onClick={() => { setView('forgot'); setError(''); }}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center pt-1">
              Forgot password?
            </button>
          </form>
        )}

        {/* ── Forgot password form ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            {forgotMsg ? (
              <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-3 rounded-md leading-relaxed">
                {forgotMsg}
                <div className="mt-2 text-zinc-500">Check your email for login credentials.</div>
              </div>
            ) : (
              <>
                {forgotError && (
                  <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2 rounded-md">
                    {forgotError}
                  </div>
                )}
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Clicking below will send your username and a temporary password to the recovery email saved in Settings.
                </p>
                <button type="submit" disabled={forgotLoading}
                  className="w-full bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 font-semibold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Reset Credentials'}
                </button>
              </>
            )}
            <button type="button" onClick={() => { setView('login'); setForgotMsg(''); setForgotError(''); }}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center">
              ← Back to sign in
            </button>
          </form>
        )}

        <p className="text-center text-xs text-zinc-600">EduTrack · Institute Management</p>
      </div>
    </div>
  );
}