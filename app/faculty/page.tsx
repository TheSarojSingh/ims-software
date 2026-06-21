'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, Download, Loader2,
  ChevronLeft, ChevronRight, BookOpen,
  Hash, Calendar, Layers,
} from 'lucide-react';
import { NEPALI_MONTHS } from '@/lib/date/month-utils';

/* ── helpers ──────────────────────────────────────────────────────────────── */
function parseMinutes(t: string): number {
  if (!t) return 0;
  const c = t.trim().toUpperCase().replace(/\s/g, '');
  const isPM = c.includes('PM'); const isAM = c.includes('AM');
  const n = c.replace('AM', '').replace('PM', '');
  const [hS, mS] = n.split(':'); let h = parseInt(hS, 10); const m = parseInt(mS || '0', 10);
  if (isPM && h !== 12) h += 12; if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

function durationLabel(s: string, e: string): string {
  const d = parseMinutes(e) - parseMinutes(s);
  if (d <= 0) return '—';
  const h = Math.floor(d / 60); const m = d % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getMonthName(ym: string): string {
  const id = parseInt(ym.split('-')[1], 10);
  return NEPALI_MONTHS.find(m => m.id === id)?.name ?? ym;
}

function Bar({ value, max, color = 'bg-zinc-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 tabular-nums w-8 text-right shrink-0">{pct}%</span>
    </div>
  );
}

const PAGE_SIZE = 15;

/* ── page ─────────────────────────────────────────────────────────────────── */
export default function FacultyPortalPage() {
  const [activeTab,       setActiveTab]       = useState<'overview' | 'history'>('overview');
  const [selectedMonth,   setSelectedMonth]   = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [search,          setSearch]          = useState('');
  const [page,            setPage]            = useState(1);
  const [pdfLoading,      setPdfLoading]      = useState(false);

  /* ── data fetch ─────────────────────────────────────────────────────────── */
  const { data, isLoading, error } = useQuery({
    queryKey: ['faculty-portal-me'],
    queryFn:  async () => {
      const res = await fetch('/api/faculty-portal/me');
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });

  /* ── filter helpers ─────────────────────────────────────────────────────── */
  const setMonth   = (v: string) => { setSelectedMonth(v);   setPage(1); };
  const setSection = (v: string) => { setSelectedSection(v); setPage(1); };
  const setQ       = (v: string) => { setSearch(v);          setPage(1); };
  const clearAll   = ()          => { setSelectedMonth('all'); setSelectedSection('all'); setSearch(''); setPage(1); };

  const hasFilters = selectedMonth !== 'all' || selectedSection !== 'all' || search.trim() !== '';

  /* ── derived data ───────────────────────────────────────────────────────── */
  const classHistory: any[]        = data?.classHistory        ?? [];
  const sectionBreakdown: any[]    = data?.sectionBreakdown    ?? [];
  const monthlyBreakdown: any[]    = data?.monthlyBreakdown    ?? [];

  // Unique section names for the filter dropdown
  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    classHistory.forEach(c => { if (c.sectionId?.name) set.add(c.sectionId.name); });
    return Array.from(set).sort();
  }, [classHistory]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    let list = classHistory;
    if (selectedMonth   !== 'all') list = list.filter((c: any) => c.classDateBS?.startsWith(selectedMonth));
    if (selectedSection !== 'all') list = list.filter((c: any) => c.sectionId?.name === selectedSection);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c: any) =>
        c.topic?.toLowerCase().includes(q)          ||
        c.subject?.toLowerCase().includes(q)        ||
        c.sectionId?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [classHistory, selectedMonth, selectedSection, search]);

  // Filtered section breakdown (recomputed when month/search active)
  const filteredSectionBreakdown = useMemo(() => {
    if (!hasFilters) return sectionBreakdown;
    const counts: Record<string, { count: number; topics: Set<string> }> = {};
    filteredHistory.forEach((c: any) => {
      const name = c.sectionId?.name ?? 'Unknown';
      if (!counts[name]) counts[name] = { count: 0, topics: new Set() };
      counts[name].count++;
      if (c.topic) counts[name].topics.add(c.topic);
    });
    return Object.entries(counts)
      .map(([sectionName, v]) => ({ sectionName, count: v.count, topicCount: v.topics.size }))
      .sort((a, b) => b.count - a.count);
  }, [filteredHistory, hasFilters, sectionBreakdown]);

  // Filtered monthly breakdown (recomputed when section/search active)
  const filteredMonthlyBreakdown = useMemo(() => {
    if (!hasFilters) return monthlyBreakdown;
    const counts: Record<string, number> = {};
    filteredHistory.forEach((c: any) => {
      const mo = c.classDateBS?.substring(0, 7);
      if (mo) counts[mo] = (counts[mo] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b._id.localeCompare(a._id));
  }, [filteredHistory, hasFilters, monthlyBreakdown]);

  const filteredTotal  = hasFilters ? filteredHistory.length : (data?.totalClasses ?? 0);
  const maxSectionCount = Math.max(...filteredSectionBreakdown.map((s: any) => s.count), 1);
  const maxMonthCount   = Math.max(...filteredMonthlyBreakdown.map((m: any) => m.count), 1);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const paginated  = useMemo(
    () => filteredHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredHistory, page]
  );

  /* ── PDF ────────────────────────────────────────────────────────────────── */
  const handleDownloadPDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const ML = 40; const MR = 40; const CW = PW - ML - MR;
      let y = 40;

      const hex  = (h: string) => ({ r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) });
      const fill = (h: string) => { const {r,g,b} = hex(h); doc.setFillColor(r,g,b); };
      const txt  = (h: string) => { const {r,g,b} = hex(h); doc.setTextColor(r,g,b); };

      const addPage = () => {
        doc.addPage(); fill('#18181b'); doc.rect(0,0,PW,PH,'F'); y = 40;
      };
      const checkY = (n: number) => { if (y + n > PH - 48) addPage(); };

      // Background
      fill('#18181b'); doc.rect(0,0,PW,PH,'F');

      // ── Profile header card ──────────────────────────────────────────────
      fill('#27272a'); doc.roundedRect(ML, y, CW, 80, 4, 4, 'F');

      // Avatar circle
      fill('#3f3f46'); doc.circle(ML + 30, y + 40, 22, 'F');
      txt('#e4e4e7'); doc.setFontSize(11); doc.setFont('helvetica','bold');
      doc.text(data.faculty.initials, ML + 30, y + 44, { align: 'center' });

      // Name + subject
      txt('#f4f4f5'); doc.setFontSize(14); doc.setFont('helvetica','bold');
      doc.text(data.faculty.fullName, ML + 60, y + 30);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); txt('#a1a1aa');
      doc.text(`${data.faculty.subject}  ·  ${data.faculty.phone}`, ML + 60, y + 46);

      // Filters note (if any)
      if (hasFilters) {
        const parts: string[] = [];
        if (selectedMonth   !== 'all') parts.push(`Month: ${getMonthName(selectedMonth)} ${selectedMonth.split('-')[0]}`);
        if (selectedSection !== 'all') parts.push(`Section: ${selectedSection}`);
        if (search)                    parts.push(`Search: "${search}"`);
        fill('#3f3f46'); doc.roundedRect(ML + 60, y + 55, CW - 65, 14, 2, 2, 'F');
        txt('#71717a'); doc.setFontSize(7.5);
        doc.text(`Filters: ${parts.join(' | ')}`, ML + 65, y + 64);
      }
      y += 96;

      // ── Stats row ────────────────────────────────────────────────────────
      const statW = (CW - 16) / 3;
      const stats = [
        { label: hasFilters ? 'Filtered Classes' : 'Total Classes', value: String(filteredTotal) },
        { label: 'Sections',                                         value: String(filteredSectionBreakdown.length) },
        { label: 'Months Active',                                    value: String(filteredMonthlyBreakdown.length) },
      ];
      stats.forEach((s, i) => {
        const sx = ML + i * (statW + 8);
        fill('#27272a'); doc.roundedRect(sx, y, statW, 50, 4, 4, 'F');
        txt('#f4f4f5'); doc.setFontSize(20); doc.setFont('helvetica','bold');
        doc.text(s.value, sx + statW / 2, y + 28, { align: 'center' });
        doc.setFontSize(8); doc.setFont('helvetica','normal'); txt('#71717a');
        doc.text(s.label, sx + statW / 2, y + 42, { align: 'center' });
      });
      y += 66;

      // ── Section breakdown ─────────────────────────────────────────────────
      if (filteredSectionBreakdown.length > 0) {
        checkY(32 + filteredSectionBreakdown.length * 22 + 16);
        txt('#e4e4e7'); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text('Section Breakdown', ML, y + 12);
        if (hasFilters) { txt('#71717a'); doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text('(filtered)', ML + 130, y + 12); }
        y += 22;

        filteredSectionBreakdown.forEach((s: any, i: number) => {
          checkY(22);
          fill(i % 2 === 0 ? '#27272a' : '#1f1f23'); doc.rect(ML, y, CW, 20, 'F');
          doc.setFontSize(9); doc.setFont('helvetica','normal');
          txt('#d4d4d8'); doc.text(s.sectionName, ML + 8, y + 13);
          txt('#71717a'); doc.text(`${s.topicCount} topics`, ML + 140, y + 13);
          txt('#f4f4f5'); doc.setFont('helvetica','bold');
          doc.text(`${s.count} classes`, ML + CW - 8, y + 13, { align: 'right' });
          y += 20;
        });
        y += 16;
      }

      // ── Monthly breakdown ─────────────────────────────────────────────────
      if (filteredMonthlyBreakdown.length > 0) {
        checkY(32 + filteredMonthlyBreakdown.length * 22 + 16);
        txt('#e4e4e7'); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text('Monthly Breakdown', ML, y + 12);
        y += 22;

        filteredMonthlyBreakdown.forEach((m: any, i: number) => {
          checkY(22);
          fill(i % 2 === 0 ? '#27272a' : '#1f1f23'); doc.rect(ML, y, CW, 20, 'F');
          doc.setFontSize(9); doc.setFont('helvetica','normal');
          txt('#d4d4d8'); doc.text(`${getMonthName(m._id)} ${m._id.split('-')[0]}`, ML + 8, y + 13);
          txt('#f4f4f5'); doc.setFont('helvetica','bold');
          doc.text(`${m.count} classes`, ML + CW - 8, y + 13, { align: 'right' });
          y += 20;
        });
        y += 16;
      }

      // ── Class history table ───────────────────────────────────────────────
      if (filteredHistory.length > 0) {
        checkY(50);
        txt('#e4e4e7'); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text('Class History', ML, y + 12);
        txt('#71717a'); doc.setFontSize(8); doc.setFont('helvetica','normal');
        doc.text(`${filteredHistory.length} records`, ML + CW, y + 12, { align: 'right' });
        y += 22;

        const cDate = 72; const cSec = 55; const cSub = 32; const cTime = 80;
        const cTopic = CW - cDate - cSec - cSub - cTime;

        // Header
        fill('#3f3f46'); doc.rect(ML, y, CW, 20, 'F');
        doc.setFontSize(8); doc.setFont('helvetica','bold'); txt('#a1a1aa');
        doc.text('Date',    ML + 4,                             y + 13);
        doc.text('Section', ML + cDate + 4,                    y + 13);
        doc.text('Subj',    ML + cDate + cSec + 4,             y + 13);
        doc.text('Topic',   ML + cDate + cSec + cSub + 4,      y + 13);
        doc.text('Time',    ML + CW - 4,                        y + 13, { align: 'right' });
        y += 20;

        filteredHistory.forEach((c: any, i: number) => {
          checkY(20);
          fill(i % 2 === 0 ? '#27272a' : '#1f1f23'); doc.rect(ML, y, CW, 18, 'F');
          doc.setFontSize(8); doc.setFont('helvetica','normal');
          txt('#a1a1aa'); doc.text(c.classDateBS ?? '', ML + 4, y + 12);
          txt('#d4d4d8'); doc.text(c.sectionId?.name ?? '', ML + cDate + 4, y + 12);
          txt('#71717a'); doc.text(c.subject ?? '', ML + cDate + cSec + 4, y + 12);
          txt('#e4e4e7');
          doc.text(doc.splitTextToSize(c.topic ?? '', cTopic - 6)[0], ML + cDate + cSec + cSub + 4, y + 12);
          txt('#71717a');
          doc.text(`${c.startTime ?? ''} – ${c.endTime ?? ''}`, ML + CW - 4, y + 12, { align: 'right' });
          y += 18;
        });
      }

      // ── Footer on every page ──────────────────────────────────────────────
      const totalPdfPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPdfPages; p++) {
        doc.setPage(p);
        fill('#18181b'); doc.rect(0, PH - 28, PW, 28, 'F');
        txt('#52525b'); doc.setFontSize(7); doc.setFont('helvetica','normal');
        doc.text(`${data.faculty.fullName} · Generated ${new Date().toLocaleDateString()}`, ML, PH - 12);
        doc.text(`Page ${p} of ${totalPdfPages}`, PW - MR, PH - 12, { align: 'right' });
      }

      const safeName = data.faculty.fullName.replace(/\s+/g, '-').toLowerCase();
      doc.save(`${safeName}-classes.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF generation failed.');
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── loading / error ────────────────────────────────────────────────────── */
  if (isLoading) return (
    <div className="p-6 flex items-center gap-2 text-sm text-zinc-500">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading your dashboard...
    </div>
  );
  if (error || !data) return (
    <div className="p-6 text-sm text-red-400">Failed to load dashboard. Please refresh.</div>
  );

  const { faculty } = data;

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="p-5 space-y-5">

      {/* ── Profile + stats ────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center font-bold text-zinc-200 text-sm shrink-0">
              {faculty.initials}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">{faculty.fullName}</h2>
              <p className="text-sm text-zinc-400 mt-0.5">{faculty.subject} · {faculty.phone}</p>
            </div>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {pdfLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Download className="w-4 h-4" /> Download PDF</>}
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-zinc-800">
          {[
            { label: hasFilters ? 'Filtered'      : 'Total Classes',  value: filteredTotal,                              icon: BookOpen,  color: 'text-emerald-400' },
            { label: hasFilters ? 'Sections (f.)' : 'Sections',       value: filteredSectionBreakdown.length,            icon: Layers,   color: 'text-blue-400' },
            { label: hasFilters ? 'Months (f.)'   : 'Months Active',  value: filteredMonthlyBreakdown.length,            icon: Calendar, color: 'text-violet-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-zinc-100">{s.value}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={e => setMonth(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All months</option>
            {data.monthlyBreakdown.map((m: any) => (
              <option key={m._id} value={m._id}>
                {getMonthName(m._id)} {m._id.split('-')[0]} ({m.count})
              </option>
            ))}
          </select>

          {/* Section selector */}
          <select
            value={selectedSection}
            onChange={e => setSection(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All sections</option>
            {sectionOptions.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setQ(e.target.value)}
              placeholder="Search topic, subject, section..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
            {search && (
              <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors border border-zinc-700"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          {/* Filter result count */}
          {hasFilters && (
            <span className="text-xs text-zinc-500 ml-auto shrink-0">
              {filteredTotal} {filteredTotal === 1 ? 'class' : 'classes'}
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1">
        {(['overview', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === tab ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'overview' ? 'Overview' : 'Class History'}
          </button>
        ))}
      </div>

      {/* ── Overview tab ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Section breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-200">By Section</h3>
              {hasFilters && <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">filtered</span>}
            </div>

            {filteredSectionBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No data for this filter.</p>
            ) : (
              <div className="space-y-3">
                {filteredSectionBreakdown.map((s: any) => (
                  <div
                    key={s.sectionName}
                    onClick={() => setSection(selectedSection === s.sectionName ? 'all' : s.sectionName)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      selectedSection === s.sectionName
                        ? 'border-emerald-800/60 bg-emerald-950/20'
                        : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          selectedSection === s.sectionName ? 'text-emerald-400' : 'text-zinc-200'
                        }`}>
                          {s.sectionName}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {s.topicCount} {s.topicCount === 1 ? 'topic' : 'topics'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-zinc-100 tabular-nums">
                        {s.count}
                      </span>
                    </div>
                    <Bar
                      value={s.count}
                      max={maxSectionCount}
                      color={selectedSection === s.sectionName ? 'bg-emerald-500/60' : 'bg-zinc-500/60'}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedSection !== 'all' && (
              <button onClick={() => setSection('all')} className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-300 py-1.5 rounded hover:bg-zinc-800 transition-colors">
                Show all sections
              </button>
            )}
          </div>

          {/* Monthly breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-200">By Month</h3>
              {hasFilters && <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">filtered</span>}
            </div>

            {filteredMonthlyBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No data for this filter.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredMonthlyBreakdown.map((m: any) => (
                  <div
                    key={m._id}
                    onClick={() => setMonth(selectedMonth === m._id ? 'all' : m._id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                      selectedMonth === m._id
                        ? 'border-violet-800/60 bg-violet-950/20'
                        : 'border-transparent hover:border-zinc-800 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="w-28 shrink-0">
                      <div className={`text-xs font-medium ${
                        selectedMonth === m._id ? 'text-violet-400' : 'text-zinc-300'
                      }`}>
                        {getMonthName(m._id)}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono">{m._id}</div>
                    </div>
                    <div className="flex-1">
                      <Bar
                        value={m.count}
                        max={maxMonthCount}
                        color={selectedMonth === m._id ? 'bg-violet-500/60' : 'bg-zinc-500/60'}
                      />
                    </div>
                    <span className="text-sm font-bold text-zinc-100 tabular-nums w-8 text-right shrink-0">
                      {m.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {selectedMonth !== 'all' && (
              <button onClick={() => setMonth('all')} className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-300 py-1.5 rounded hover:bg-zinc-800 transition-colors">
                Show all months
              </button>
            )}

            <p className="text-[10px] text-zinc-700 mt-3 text-center">Click a month or section to filter</p>
          </div>
        </div>
      )}

      {/* ── Class history tab ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

          {/* Table header info */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-xs text-zinc-400">
              {filteredHistory.length} {filteredHistory.length === 1 ? 'class' : 'classes'}
              {hasFilters && <span className="text-zinc-600 ml-1">(filtered)</span>}
            </span>
            {totalPages > 1 && (
              <span className="text-xs text-zinc-500">
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="text-left p-3 pl-4 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Section</th>
                  <th className="text-left p-3 font-medium">Subject</th>
                  <th className="text-left p-3 font-medium">Topic</th>
                  <th className="text-left p-3 font-medium whitespace-nowrap">Start</th>
                  <th className="text-left p-3 font-medium whitespace-nowrap">End</th>
                  <th className="text-left p-3 pr-4 font-medium">Dur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm text-zinc-500">
                      {hasFilters ? 'No classes match your filters.' : 'No classes recorded yet.'}
                    </td>
                  </tr>
                ) : paginated.map((c: any, i: number) => (
                  <tr key={c._id ?? i} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3 pl-4 text-zinc-300 font-mono text-xs whitespace-nowrap">{c.classDateBS}</td>
                    <td className="p-3">
                      <button
                        onClick={() => setSection(selectedSection === c.sectionId?.name ? 'all' : c.sectionId?.name ?? 'all')}
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${
                          selectedSection === c.sectionId?.name
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                        }`}
                      >
                        {c.sectionId?.name ?? '—'}
                      </button>
                    </td>
                    <td className="p-3 text-zinc-500 text-xs font-mono uppercase">{c.subject}</td>
                    <td className="p-3 text-zinc-200 text-xs">{c.topic}</td>
                    <td className="p-3 text-zinc-400 font-mono text-xs whitespace-nowrap">{c.startTime}</td>
                    <td className="p-3 text-zinc-500 font-mono text-xs whitespace-nowrap">{c.endTime}</td>
                    <td className="p-3 pr-4 text-zinc-600 text-xs whitespace-nowrap">
                      {durationLabel(c.startTime, c.endTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <span className="text-xs text-zinc-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredHistory.length)}
                {' '}of {filteredHistory.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2 py-1 text-xs bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >«</button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>

                {/* Page number pills */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5)        p = i + 1;
                    else if (page <= 3)         p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else                        p = page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 text-xs rounded transition-colors ${
                          page === p
                            ? 'bg-zinc-200 text-zinc-900 font-bold'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2 py-1 text-xs bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                >»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}