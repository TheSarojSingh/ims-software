'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, LogOut, Loader2 } from 'lucide-react';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const [name,   setName]    = useState('');
  const [ready,  setReady]   = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.success || d.role !== 'faculty') { router.replace('/faculty-login'); return; }
        setName(d.username);
        setReady(true);
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/faculty-login');
    router.refresh();
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="w-5 h-5 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-100">Faculty Portal</span>
          <span className="text-zinc-700">·</span>
          <span className="text-sm text-zinc-400 font-mono">{name}</span>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-red-500/70 hover:text-red-400 hover:bg-red-950/30 px-2.5 py-1.5 rounded-md transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </header>
      <main className="max-w-4xl mx-auto">{children}</main>
    </div>
  );
}