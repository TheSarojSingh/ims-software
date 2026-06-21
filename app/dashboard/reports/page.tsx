'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInstitute } from '@/hooks/useInstitute';
import { useFaculties } from '@/hooks/useFaculties';
import { useSections } from '@/hooks/useSections';
import { getTodayBS } from '@/lib/date/bs-date';
import { NEPALI_MONTHS } from '@/lib/date/month-utils';
import { BarChart3, Loader2, Download, RefreshCw } from 'lucide-react';

type ReportType = 'faculty-summary' | 'section-summary' | 'monthly' | 'daily';

const TYPE_LABELS: Record<ReportType, string> = {
  'faculty-summary': 'By Faculty',
  'section-summary': 'By Section',
  'monthly':         'Monthly Trend',
  'daily':           'Daily Trend',
};

function getMonthName(ym: string) {
  const id = parseInt(ym.split('-')[1], 10);
  return NEPALI_MONTHS.find(m => m.id === id)?.name ?? ym;
}

// ── Inline bar ────────────────────────────────────────────────────────────────
function Bar({ value, max, color = 'bg-zinc-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-24">
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

export default function ReportsPage() {
  const todayBS = getTodayBS();
  const [y, m]  = todayBS.split('-');

  const { instituteId, apiHeaders } = useInstitute();
  const { data: faculties = [] }    = useFaculties('', true);
  const { data: sections  = [] }    = useSections(true);

  const [type,        setType]        = useState<ReportType>('faculty-summary');
  const [startDateBS, setStartDateBS] = useState(`${y}-${m}-01`);
  const [endDateBS,   setEndDateBS]   = useState(todayBS);
  const [facultyId,   setFacultyId]   = useState('');
  const [sectionId,   setSectionId]   = useState('');
  const [triggerKey,  setTriggerKey]  = useState(0); // bump to re-run query

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['reports', instituteId, type, startDateBS, endDateBS, facultyId, sectionId, triggerKey],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const p = new URLSearchParams({ type });
      if (startDateBS) p.set('startDateBS', startDateBS);
      if (endDateBS)   p.set('endDateBS',   endDateBS);
      if (facultyId)   p.set('facultyId',   facultyId);
      if (sectionId)   p.set('sectionId',   sectionId);
      const res = await fetch(`/api/reports?${p}`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data as any[];
    },
  });

  const rows    = data ?? [];
  const maxTotal = useMemo(() => Math.max(...rows.map((r: any) => r.total ?? 0), 1), [rows]);
  const grandTotal = useMemo(() => rows.reduce((sum: number, r: any) => sum + (r.total ?? 0), 0), [rows]);

  const loading = isLoading || isFetching;

  const presets = [
    { label: 'Today',       start: todayBS,         end: todayBS },
    { label: 'This month',  start: `${y}-${m}-01`,  end: todayBS },
    { label: 'Last 3 months', start: (() => {
        const nm = parseInt(m, 10) - 2;
        return nm < 1 ? `${parseInt(y)-1}-${String(12+nm).padStart(2,'0')}-01` : `${y}-${String(nm).padStart(2,'0')}-01`;
      })(), end: todayBS },
    { label: 'This year',   start: `${y}-01-01`,    end: todayBS },
    { label: 'All time',    start: '',               end: '' },
  ];

  const applyPreset = (start: string, end: string) => {
    setStartDateBS(start); setEndDateBS(end); setTriggerKey(k => k + 1);
  };

  const exportCSV = () => {
    if (!rows.length) return;
    let header = '';
    let body   = '';

    if (type === 'faculty-summary') {
      header = 'Faculty,Initials,Subject,Total Classes,Sections,Topics\n';
      body   = rows.map((r: any) => `"${r.fullName}",${r.initials},${r.subject},${r.total},${r.sectionCount},${r.topicCount}`).join('\n');
    } else if (type === 'section-summary') {
      header = 'Section,Total Classes,Faculty Count,Topics\n';
      body   = rows.map((r: any) => `"${r.name}",${r.total},${r.facultyCount},${r.topicCount}`).join('\n');
    } else {
      header = 'Period,Total Classes\n';
      body   = rows.map((r: any) => `${r._id},${r.total}`).join('\n');
    }

    const blob = new Blob([header + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `report-${type}-${todayBS}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!instituteId) return <div className="p-6 text-sm text-zinc-500">Select an institute from the sidebar.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Reports</h1>
          <p className="text-sm text-zinc-400">Aggregated class statistics</p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" /> CSV
            </button>
          )}
          <button onClick={() => setTriggerKey(k => k + 1)} disabled={loading}
            className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">

        {/* Report type tabs */}
        <div className="flex gap-1 p-1 bg-zinc-800/60 rounded-lg w-fit">
          {(Object.entries(TYPE_LABELS) as [ReportType, string][]).map(([t, label]) => (
            <button key={t} onClick={() => { setType(t); setTriggerKey(k => k + 1); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                type === t ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Start Date (B.S.)</label>
            <input value={startDateBS} onChange={e => setStartDateBS(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
              placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">End Date (B.S.)</label>
            <input value={endDateBS} onChange={e => setEndDateBS(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
              placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Faculty (optional)</label>
            <select value={facultyId} onChange={e => setFacultyId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500">
              <option value="">All faculty</option>
              {faculties.map((f: any) => (
                <option key={f._id} value={f._id}>[{f.subject}-{f.initials}] {f.fullName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Section (optional)</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500">
              <option value="">All sections</option>
              {sections.map((s: any) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick date presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-600">Quick:</span>
          {presets.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.start, p.end)}
              className="text-xs text-zinc-500 hover:text-zinc-200 px-2.5 py-1 rounded-md hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-zinc-700">
              {p.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <div className="text-xs text-zinc-600">
            {dataUpdatedAt > 0 && !loading && (
              <span>Last run: {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
            )}
          </div>
          <button onClick={() => setTriggerKey(k => k + 1)} disabled={loading}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
              : <><BarChart3 className="w-4 h-4" /> Run Report</>}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Generating report...
        </div>
      )}

      {!loading && rows.length === 0 && dataUpdatedAt > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500">
          No data for the selected filters.
        </div>
      )}

      {/* Faculty summary */}
      {!loading && rows.length > 0 && type === 'faculty-summary' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-200">Faculty Summary</h2>
            <span className="text-xs text-zinc-500">{rows.length} faculty · {grandTotal} total classes</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left p-3 pl-4 font-medium w-6">#</th>
                <th className="text-left p-3 font-medium">Faculty</th>
                <th className="text-left p-3 font-medium">Subject</th>
                <th className="text-left p-3 font-medium">Classes</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Share</th>
                <th className="text-left p-3 font-medium">Sections</th>
                <th className="text-left p-3 pr-4 font-medium">Topics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((row: any, i: number) => (
                <tr key={row.facultyId} className="hover:bg-zinc-800/40">
                  <td className="p-3 pl-4 text-zinc-600 text-xs">{i + 1}</td>
                  <td className="p-3">
                    <div className="text-sm text-zinc-200 font-medium">{row.fullName}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{row.subject}-{row.initials}</div>
                  </td>
                  <td className="p-3 text-zinc-400 font-mono text-xs">{row.subject}</td>
                  <td className="p-3">
                    <div className="text-sm font-bold text-zinc-100">{row.total}</div>
                    <div className="mt-1 hidden sm:block">
                      <Bar value={row.total} max={maxTotal} color="bg-emerald-500/60" />
                    </div>
                  </td>
                  <td className="p-3 text-zinc-400 text-xs hidden md:table-cell">
                    {grandTotal > 0 ? ((row.total / grandTotal) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="p-3 text-zinc-400 text-xs">{row.sectionCount}</td>
                  <td className="p-3 pr-4 text-zinc-400 text-xs">{row.topicCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 bg-zinc-800/30">
                <td colSpan={3} className="p-3 pl-4 text-xs text-zinc-500 font-medium">Total</td>
                <td className="p-3 text-sm font-bold text-zinc-100">{grandTotal}</td>
                <td className="p-3 text-xs text-zinc-500 hidden md:table-cell">100%</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Section summary */}
      {!loading && rows.length > 0 && type === 'section-summary' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-200">Section Summary</h2>
            <span className="text-xs text-zinc-500">{rows.length} sections · {grandTotal} total classes</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left p-3 pl-4 font-medium w-6">#</th>
                <th className="text-left p-3 font-medium">Section</th>
                <th className="text-left p-3 font-medium">Classes</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Share</th>
                <th className="text-left p-3 font-medium">Faculty</th>
                <th className="text-left p-3 pr-4 font-medium">Topics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((row: any, i: number) => (
                <tr key={row.sectionId} className="hover:bg-zinc-800/40">
                  <td className="p-3 pl-4 text-zinc-600 text-xs">{i + 1}</td>
                  <td className="p-3 text-sm font-medium text-zinc-200">{row.name}</td>
                  <td className="p-3">
                    <div className="text-sm font-bold text-zinc-100">{row.total}</div>
                    <div className="mt-1 hidden sm:block">
                      <Bar value={row.total} max={maxTotal} color="bg-blue-500/60" />
                    </div>
                  </td>
                  <td className="p-3 text-zinc-400 text-xs hidden md:table-cell">
                    {grandTotal > 0 ? ((row.total / grandTotal) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="p-3 text-zinc-400 text-xs">{row.facultyCount}</td>
                  <td className="p-3 pr-4 text-zinc-400 text-xs">{row.topicCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 bg-zinc-800/30">
                <td colSpan={2} className="p-3 pl-4 text-xs text-zinc-500 font-medium">Total</td>
                <td className="p-3 text-sm font-bold text-zinc-100">{grandTotal}</td>
                <td className="p-3 text-xs text-zinc-500 hidden md:table-cell">100%</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Monthly trend */}
      {!loading && rows.length > 0 && type === 'monthly' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-200">Monthly Trend</h2>
            <span className="text-xs text-zinc-500">{rows.length} months · {grandTotal} total classes</span>
          </div>
          <div className="divide-y divide-zinc-800">
            {rows.map((row: any) => (
              <div key={row._id} className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/40">
                <div className="w-32 shrink-0">
                  <div className="text-sm text-zinc-200 font-medium">
                    {getMonthName(row._id)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">{row._id}</div>
                </div>
                <div className="flex-1">
                  <Bar value={row.total} max={maxTotal} color="bg-violet-500/60" />
                </div>
                <div className="w-16 text-right">
                  <div className="text-sm font-bold text-zinc-100 tabular-nums">{row.total}</div>
                  <div className="text-[10px] text-zinc-500">
                    {grandTotal > 0 ? ((row.total / grandTotal) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 px-4 py-3 bg-zinc-800/30">
              <div className="w-32 text-xs text-zinc-500 font-medium">Total</div>
              <div className="flex-1" />
              <div className="w-16 text-right text-sm font-bold text-zinc-100">{grandTotal}</div>
            </div>
          </div>
        </div>
      )}

      {/* Daily trend */}
      {!loading && rows.length > 0 && type === 'daily' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-200">Daily Trend</h2>
            <span className="text-xs text-zinc-500">{rows.length} days · {grandTotal} total classes</span>
          </div>
          <div className="divide-y divide-zinc-800max-h-[520px] overflow-y-auto">
            {rows.map((row: any) => (
              <div key={row._id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-zinc-800/40">
                <div className="w-32 shrink-0">
                  <div className="text-xs text-zinc-300 font-mono">{row._id}</div>
                </div>
                <div className="flex-1">
                  <Bar value={row.total} max={maxTotal} color="bg-amber-500/60" />
                </div>
                <div className="w-12 text-right">
                  <span className="text-sm font-bold text-zinc-100 tabular-nums">{row.total}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 px-4 py-2.5 bg-zinc-800/30">
              <div className="w-32 text-xs text-zinc-500 font-medium">Total ({rows.length} days)</div>
              <div className="flex-1" />
              <div className="w-12 text-right text-sm font-bold text-zinc-100">{grandTotal}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}