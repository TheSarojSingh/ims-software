'use client';

import React, { useState, useEffect } from 'react';
import {
  Check, Loader2, Eye, EyeOff, KeyRound,
  ShieldCheck, Mail, Globe, User,
} from 'lucide-react';

export default function SettingsPage() {
  const [username,     setUsername]     = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwSuccess,    setPwSuccess]    = useState('');
  const [pwError,      setPwError]      = useState('');

  const [email,          setEmail]          = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSuccess,   setEmailSuccess]   = useState('');
  const [emailError,     setEmailError]     = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setUsername(d.username);
    });
    fetch('/api/settings/email').then(r => r.json()).then(d => {
      if (d.success) setEmail(d.email || '');
    });
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPassword !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPassword.length < 6)    { setPwError('At least 6 characters required.'); return; }
    setPwSubmitting(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setPwSuccess('Password updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPw('');
    } catch (err: any) { setPwError(err.message); }
    finally { setPwSubmitting(false); }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(''); setEmailSuccess('');
    setEmailSubmitting(true);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setEmailSuccess('Recovery email saved.');
    } catch (err: any) { setEmailError(err.message); }
    finally { setEmailSubmitting(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Page header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-100">Admin Settings</h1>
              <span className="text-[9px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">Global</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">These settings apply to the admin account, not to any specific institute.</p>
          </div>
        </div>

        {/* Admin info */}
        {username && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-200 font-mono">{username}</div>
                <div className="text-[10px] text-zinc-500">Administrator account</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recovery email */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Recovery Email</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Used to receive password reset credentials</p>
          </div>
        </div>

        {emailSuccess && (
          <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-xs px-3 py-2.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> {emailSuccess}
          </div>
        )}
        {emailError && (
          <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2.5 rounded-lg">{emailError}</div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
              placeholder="admin@yourinstitute.com"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={emailSubmitting}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {emailSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Email
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Change Password</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Update your admin login password</p>
          </div>
        </div>

        {pwSuccess && (
          <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-sm px-3 py-2.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 shrink-0" /> {pwSuccess}
          </div>
        )}
        {pwError && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2.5 rounded-lg">{pwError}</div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 pr-10"
                placeholder="Enter current password"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required minLength={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 pr-10"
                  placeholder="Min 6 characters"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                className={`w-full bg-zinc-800 border rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none ${
                  confirmPw && confirmPw !== newPassword
                    ? 'border-red-700 focus:border-red-600'
                    : 'border-zinc-700 focus:border-zinc-500'
                }`}
                placeholder="Repeat new password"
              />
              {confirmPw && confirmPw !== newPassword && (
                <p className="text-[10px] text-red-400">Passwords do not match</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={pwSubmitting || (!!confirmPw && confirmPw !== newPassword)}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {pwSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                : <><Check className="w-4 h-4" /> Update Password</>}
            </button>
          </div>
        </form>
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-zinc-700 pb-2">
        EduTrack · Global Admin Panel
      </div>
    </div>
  );
}