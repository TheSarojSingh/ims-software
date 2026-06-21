'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, GraduationCap } from 'lucide-react';

export default function FacultyLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/faculty-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      router.push('/faculty');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6 text-zinc-300" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Faculty Portal</h1>
          <p className="text-sm text-zinc-500">Sign in to view your class records</p>
        </div>

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
              onChange={e => setUsername(e.target.value)}
              required autoFocus autoComplete="username"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
              placeholder="your.username"
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
        </form>

        <p className="text-center text-xs text-zinc-600">EduTrack · Faculty Portal</p>
      </div>
    </div>
  );
}