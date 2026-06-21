'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInstitute } from '@/hooks/useInstitute';
import { getTodayBS } from '@/lib/date/bs-date';
import { BookOpen, Users, Layers, CalendarDays, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { instituteId, activeInstitute, apiHeaders } = useInstitute();
  const [page, setPage] = useState(1);
  const todayBS = getTodayBS();

  // ── Summary stats ─────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', instituteId],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const res = await fetch('/api/dashboard/summary', { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });

  // ── Today's classes ───────────────────────────────────────────────────────
  const { data: todayData, isLoading: classesLoading } = useQuery({
    queryKey: ['dashboard-today-classes', instituteId, todayBS],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const res = await fetch(`/api/classes?classDateBS=${todayBS}&limit=500`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data as any[];
    },
  });

  const todayClasses  = todayData ?? [];
  const totalPages    = Math.max(1, Math.ceil(todayClasses.length / PAGE_SIZE));
  const paginated     = useMemo(
    () => todayClasses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [todayClasses, page]
  );

  if (!instituteId) return (
    <div className="p-6 text-sm text-zinc-500">Select an institute from the sidebar to get started.</div>
  );

  const stats = [
    { label: "Today's Classes",  value: summary?.todayCount    ?? '—', icon: CalendarDays, color: 'text-blue-400' },
    { label: 'This Month',       value: summary?.monthCount    ?? '—', icon: BookOpen,     color: 'text-emerald-400' },
    { label: 'Active Faculty',   value: summary?.totalFaculties ?? '—', icon: Users,       color: 'text-violet-400' },
    { label: 'Active Sections',  value: summary?.totalSections  ?? '—', icon: Layers,      color: 'text-amber-400' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">{activeInstitute?.name}</h1>
        <p className="text-sm text-zinc-400">{todayBS} B.S.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-zinc-500">{s.label}</span>
            </div>
            {summaryLoading
              ? <div className="h-7 w-12 bg-zinc-800 rounded animate-pulse" />
              : <div className="text-2xl font-bold text-zinc-100">{s.value}</div>}
          </div>
        ))}
      </div>

      {/* Today's classes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">Today's Classes</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{todayBS} B.S.</p>
          </div>
          {todayClasses.length > 0 && (
            <span className="text-xs text-zinc-500">
              {todayClasses.length} {todayClasses.length === 1 ? 'class' : 'classes'}
            </span>
          )}
        </div>

        {classesLoading ? (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="text-left p-3 pl-4 font-medium">Time</th>
                  <th className="text-left p-3 font-medium">Section</th>
                  <th className="text-left p-3 font-medium">Faculty</th>
                  <th className="text-left p-3 font-medium">Subject</th>
                  <th className="text-left p-3 font-medium">Topic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm">
                      No classes recorded today.
                    </td>
                  </tr>
                ) : paginated.map((c: any) => (
                  <tr key={c._id} className="hover:bg-zinc-800/40">
                    <td className="p-3 pl-4 text-zinc-400 font-mono text-xs whitespace-nowrap">
                      {c.startTime} – {c.endTime}
                    </td>
                    <td className="p-3 text-zinc-300 text-xs">{c.sectionId?.name}</td>
                    <td className="p-3">
                      <div className="font-mono font-bold text-zinc-200 text-xs">{c.facultyId?.initials}</div>
                      <div className="text-[10px] text-zinc-500">{c.facultyId?.fullName}</div>
                    </td>
                    <td className="p-3 text-zinc-500 text-xs uppercase font-mono">{c.subject}</td>
                    <td className="p-3 text-zinc-200 text-xs">{c.topic}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination — only show if more than one page */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, todayClasses.length)} of {todayClasses.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-zinc-500 px-1">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}