'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Search, X, KeyRound, Eye, EyeOff, Check } from 'lucide-react';
import { NEPALI_MONTHS } from '@/lib/date/month-utils';
import { useInstitute } from '@/hooks/useInstitute';

/* ── helpers (unchanged) ────────────────────────────────────────────────── */
function parseMinutes(t: string): number {
  if (!t) return 0;
  const clean = t.trim().toUpperCase().replace(/\s/g, '');
  const isPM = clean.includes('PM'); const isAM = clean.includes('AM');
  const numeric = clean.replace('AM', '').replace('PM', '');
  const [hStr, mStr] = numeric.split(':');
  let h = parseInt(hStr, 10); const m = parseInt(mStr || '0', 10);
  if (isPM && h !== 12) h += 12; if (isAM && h === 12) h = 0;
  return h * 60 + m;
}
function durationLabel(s: string, e: string) {
  const d = parseMinutes(e) - parseMinutes(s);
  if (d <= 0) return '—';
  const h = Math.floor(d / 60); const m = d % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}
const PAGE_SIZE = 20;

export default function FacultyDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();
  const { apiHeaders } = useInstitute();

  const [activeTab,     setActiveTab]     = useState<'overview' | 'topics' | 'portal'>('overview');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [pdfLoading,    setPdfLoading]    = useState(false);

  // Credentials state
  const [credUsername,  setCredUsername]  = useState('');
  const [credPassword,  setCredPassword]  = useState('');
  const [showCredPw,    setShowCredPw]    = useState(false);
  const [credSaving,    setCredSaving]    = useState(false);
  const [credMsg,       setCredMsg]       = useState('');
  const [credError,     setCredError]     = useState('');
  const [revokeSaving,  setRevokeSaving]  = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['faculty', id],
    queryFn: async () => {
      const res = await fetch(`/api/faculties/${id}`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });

  const getMonthName = (ym: string) => {
    const id = parseInt(ym.split('-')[1], 10);
    return NEPALI_MONTHS.find(m => m.id === id)?.name ?? ym;
  };

  const monthOptions = useMemo(() => {
    if (!data?.monthlyBreakdown) return [];
    return data.monthlyBreakdown.map((m: any) => ({
      value: m._id, count: m.count,
      label: `${getMonthName(m._id)} ${m._id.split('-')[0]}`,
    }));
  }, [data]);

  const filteredTopicHistory = useMemo(() => {
    if (!data?.topicHistory) return [];
    let list = data.topicHistory;
    if (selectedMonth !== 'all') list = list.filter((t: any) => t.classDateBS?.startsWith(selectedMonth));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t: any) =>
        t.topic?.toLowerCase().includes(q) ||
        t.sectionId?.name?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, selectedMonth, search]);

  const filteredSectionBreakdown = useMemo(() => {
    if (!data) return [];
    if (selectedMonth === 'all' && !search) return data.sectionBreakdown;
    const counts: Record<string, any> = {};
    filteredTopicHistory.forEach((t: any) => {
      const name = t.sectionId?.name ?? 'Unknown';
      counts[name] = { name, count: (counts[name]?.count ?? 0) + 1 };
    });
    return Object.values(counts).sort((a: any, b: any) => b.count - a.count);
  }, [data, filteredTopicHistory, selectedMonth, search]);

  const filteredTotal = selectedMonth === 'all' && !search ? data?.totalClasses ?? 0 : filteredTopicHistory.length;
  const totalPages    = Math.max(1, Math.ceil(filteredTopicHistory.length / PAGE_SIZE));
  const paginated     = useMemo(() => filteredTopicHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredTopicHistory, page]);

  const setMonth  = (v: string) => { setSelectedMonth(v); setPage(1); };
  const setSearch2= (v: string) => { setSearch(v); setPage(1); };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredSaving(true); setCredMsg(''); setCredError('');
    try {
      const body: any = {};
      if (credUsername.trim()) body.username = credUsername.trim();
      if (credPassword.trim()) body.newPassword = credPassword.trim();
      const res = await fetch(`/api/faculties/${id}`, {
        method: 'PATCH', headers: apiHeaders(), body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setCredMsg('Portal credentials saved.'); setCredUsername(''); setCredPassword('');
      qc.invalidateQueries({ queryKey: ['faculty', id] });
    } catch (err: any) { setCredError(err.message); }
    finally { setCredSaving(false); }
  };

  const handleRevokeAccess = async () => {
    if (!confirm('Revoke faculty portal access?')) return;
    setRevokeSaving(true);
    try {
      const res = await fetch(`/api/faculties/${id}`, {
        method: 'PATCH', headers: apiHeaders(), body: JSON.stringify({ username: null }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setCredMsg('Portal access revoked.');
      qc.invalidateQueries({ queryKey: ['faculty', id] });
    } catch (err: any) { setCredError(err.message); }
    finally { setRevokeSaving(false); }
  };

  /* PDF generation omitted for brevity — copy from original, adding `headers: apiHeaders()` to the query */

  if (isLoading) return <div className="p-6 text-sm text-zinc-500">Loading...</div>;
  if (!data)     return <div className="p-6 text-sm text-zinc-500">Faculty not found.</div>;

  const { faculty, totalSections, totalTopics, monthlyBreakdown } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={e => setMonth(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1.5 focus:outline-none">
            <option value="all">All months</option>
            {monthOptions.map((m: any) => <option key={m.value} value={m.value}>{m.label} ({m.count})</option>)}
          </select>
          <button disabled={pdfLoading}
            className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-md transition-colors disabled:opacity-50">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {pdfLoading ? 'Generating...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Faculty header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-200 text-sm">
              {faculty.initials}
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-100">{faculty.fullName}</h1>
              <p className="text-sm text-zinc-400">{faculty.subject} · {faculty.phone}</p>
              {faculty.username && (
                <p className="text-xs text-emerald-400 mt-0.5 font-mono">Portal: {faculty.username}</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-800">
          {[
            { label: selectedMonth === 'all' && !search ? 'Total Classes' : 'Filtered', value: filteredTotal },
            { label: 'Sections Taught', value: totalSections },
            { label: 'Unique Topics',   value: totalTopics },
          ].map(s => (
            <div key={s.label}>
              <div className="text-xl font-bold text-zinc-100">{s.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['overview', 'topics', 'portal'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${activeTab === tab ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {tab === 'portal' ? 'Portal Access' : tab === 'topics' ? 'Topic History' : 'Overview'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-medium text-zinc-200 mb-3">Section Breakdown</h2>
            {filteredSectionBreakdown.length === 0 ? <p className="text-xs text-zinc-500">No data.</p>
              : filteredSectionBreakdown.map((s: any) => (
                <div key={s._id ?? s.name} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-sm text-zinc-300">{s.sectionName ?? s.name}</span>
                  <span className="text-sm font-medium text-zinc-100">{s.count} classes</span>
                </div>
              ))}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-medium text-zinc-200 mb-3">Monthly Breakdown</h2>
            {monthlyBreakdown.length === 0 ? <p className="text-xs text-zinc-500">No data.</p>
              : monthlyBreakdown.map((m: any) => (
                <div key={m._id} onClick={() => setMonth(selectedMonth === m._id ? 'all' : m._id)}
                  className={`flex items-center justify-between py-2 px-2 border-b border-zinc-800 last:border-0 rounded cursor-pointer transition-colors ${selectedMonth === m._id ? 'bg-zinc-700' : 'hover:bg-zinc-800/60'}`}>
                  <span className="text-sm text-zinc-300">{getMonthName(m._id)} {m._id.split('-')[0]}</span>
                  <span className="text-sm font-medium text-zinc-100">{m.count} classes</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'topics' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={e => setSearch2(e.target.value)} placeholder="Search topic, section..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-8 pr-8 py-1.5 text-xs text-zinc-200 focus:outline-none" />
              {search && <button onClick={() => setSearch2('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"><X className="w-3 h-3" /></button>}
            </div>
            <span className="text-xs text-zinc-500">{filteredTopicHistory.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="text-left p-3 pl-4 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Section</th>
                  <th className="text-left p-3 font-medium">Topic</th>
                  <th className="text-left p-3 font-medium">Start</th>
                  <th className="text-left p-3 font-medium">End</th>
                  <th className="text-left p-3 font-medium">Dur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-xs text-zinc-500">No records match.</td></tr>
                ) : paginated.map((t: any) => (
                  <tr key={t._id} className="hover:bg-zinc-800/40">
                    <td className="p-3 pl-4 text-zinc-300 font-mono text-xs">{t.classDateBS}</td>
                    <td className="p-3 text-zinc-400 text-xs">{t.sectionId?.name}</td>
                    <td className="p-3 text-zinc-200">{t.topic}</td>
                    <td className="p-3 text-zinc-400 font-mono text-xs">{t.startTime}</td>
                    <td className="p-3 text-zinc-500 font-mono text-xs">{t.endTime}</td>
                    <td className="p-3 text-zinc-600 text-xs">{durationLabel(t.startTime, t.endTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30">Next</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30">»</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'portal' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <KeyRound className="w-4 h-4 text-zinc-400" />
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Faculty Portal Access</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {faculty.username
                  ? `Portal enabled · login: ${faculty.username}`
                  : 'No portal access configured'}
              </p>
            </div>
          </div>

          {credMsg && <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-2 rounded-md">{credMsg}</div>}
          {credError && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2 rounded-md">{credError}</div>}

          <form onSubmit={handleSaveCredentials} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Username</label>
                <input value={credUsername} onChange={e => setCredUsername(e.target.value)}
                  placeholder={faculty.username ?? 'e.g. ram.sharma'}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">New Password</label>
                <div className="relative">
                  <input type={showCredPw ? 'text' : 'password'} value={credPassword}
                    onChange={e => setCredPassword(e.target.value)} placeholder="Leave blank to keep"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 pr-9" />
                  <button type="button" onClick={() => setShowCredPw(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showCredPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              {faculty.username && (
                <button type="button" onClick={handleRevokeAccess} disabled={revokeSaving}
                  className="text-xs text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3 py-2 rounded-md transition-colors disabled:opacity-40">
                  {revokeSaving ? 'Revoking...' : 'Revoke Access'}
                </button>
              )}
              <button type="submit" disabled={credSaving || (!credUsername.trim() && !credPassword.trim())}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">
                {credSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Credentials
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}