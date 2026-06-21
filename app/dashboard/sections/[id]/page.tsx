'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Search, X } from 'lucide-react';
import { NEPALI_MONTHS } from '@/lib/date/month-utils';
import { useInstitute } from '@/hooks/useInstitute';

export default function SectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { apiHeaders } = useInstitute();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'topics'>('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['section', id],
    queryFn: async () => {
      const res = await fetch(`/api/sections/${id}`,{ headers: apiHeaders() });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });

  const getMonthName = (yearMonth: string) => {
    const monthId = parseInt(yearMonth.split('-')[1], 10);
    return NEPALI_MONTHS.find(m => m.id === monthId)?.name ?? yearMonth;
  };

  // Month options derived from monthly breakdown
  const monthOptions = useMemo(() => {
    if (!data?.monthlyBreakdown) return [];
    return data.monthlyBreakdown.map((m: any) => ({
      value: m._id,
      label: `${getMonthName(m._id)} ${m._id.split('-')[0]}`,
      count: m.count,
    }));
  }, [data]);

  // Filtered + searched topic history
  const filteredTopics = useMemo(() => {
    if (!data?.topicHistory) return [];
    let list = data.topicHistory;
    if (selectedMonth !== 'all') {
      list = list.filter((t: any) => t.classDateBS?.startsWith(selectedMonth));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t: any) =>
          t.topic?.toLowerCase().includes(q) ||
          t.facultyId?.initials?.toLowerCase().includes(q) ||
          t.facultyId?.fullName?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, selectedMonth, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTopics.length / PAGE_SIZE));
  const paginatedTopics = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTopics.slice(start, start + PAGE_SIZE);
  }, [filteredTopics, page]);

  // Filtered section breakdown (recomputed when month filter active)
  const filteredFacultyBreakdown = useMemo(() => {
    if (!data) return [];
    if (selectedMonth === 'all') return data.facultyBreakdown;
    const counts: Record<string, any> = {};
    filteredTopics.forEach((t: any) => {
      const key = t.facultyId?._id ?? 'unknown';
      if (!counts[key]) {
        counts[key] = {
          _id: key,
          facultyName: t.facultyId?.fullName ?? 'Unknown',
          initials: t.facultyId?.initials ?? '',
          subject: t.subject ?? '',
          count: 0,
        };
      }
      counts[key].count++;
    });
    return Object.values(counts).sort((a: any, b: any) => b.count - a.count);
  }, [data, filteredTopics, selectedMonth]);

  const filteredTotalClasses =
    selectedMonth === 'all' && !search ? data?.totalClasses ?? 0 : filteredTopics.length;

  // Reset page when filters change
  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    setPage(1);
  };
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // ── PDF via jsPDF (no html2canvas, no CSS color parsing) ──────────────────
  const handleDownloadPDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');

      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const ML = 40;
      const MR = 40;
      const CW = PW - ML - MR;
      let y = 40;

      const hex = (h: string) => ({
        r: parseInt(h.slice(1, 3), 16),
        g: parseInt(h.slice(3, 5), 16),
        b: parseInt(h.slice(5, 7), 16),
      });
      const setFill = (h: string) => { const { r, g, b } = hex(h); doc.setFillColor(r, g, b); };
      const setTxt = (h: string) => { const { r, g, b } = hex(h); doc.setTextColor(r, g, b); };

      const newPage = () => {
        doc.addPage();
        setFill('#18181b');
        doc.rect(0, 0, PW, PH, 'F');
        y = 40;
      };
      const checkY = (needed: number) => { if (y + needed > PH - 48) newPage(); };

      // Background
      setFill('#18181b');
      doc.rect(0, 0, PW, PH, 'F');

      // ── Header card ──────────────────────────────────────────────────────
      setFill('#27272a');
      doc.roundedRect(ML, y, CW, 70, 4, 4, 'F');

      // Avatar
      setFill('#3f3f46');
      doc.circle(ML + 26, y + 35, 20, 'F');
      setTxt('#e4e4e7');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(data.section.name.slice(0, 2), ML + 26, y + 39, { align: 'center' });

      // Name + status
      doc.setFontSize(13);
      setTxt('#f4f4f5');
      doc.text(data.section.name, ML + 54, y + 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setTxt('#a1a1aa');
      const statusLine = [
        data.section.status,
        data.section.remarks,
        selectedMonth !== 'all'
          ? `· ${monthOptions.find((m: any) => m.value === selectedMonth)?.label}`
          : '',
      ].filter(Boolean).join('  ');
      doc.text(statusLine, ML + 54, y + 43);

      y += 82;

      // ── Stats ────────────────────────────────────────────────────────────
      const statW = (CW - 8) / 2;
      const stats = [
        {
          label: selectedMonth === 'all' && !search ? 'Total Classes' : 'Filtered Classes',
          value: String(filteredTotalClasses),
        },
        { label: 'Faculty Engaged', value: String(filteredFacultyBreakdown.length) },
      ];
      stats.forEach((s, i) => {
        const sx = ML + i * (statW + 8);
        setFill('#27272a');
        doc.roundedRect(sx, y, statW, 48, 4, 4, 'F');
        setTxt('#f4f4f5');
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(s.value, sx + statW / 2, y + 26, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        setTxt('#71717a');
        doc.text(s.label, sx + statW / 2, y + 40, { align: 'center' });
      });
      y += 62;

      // ── Faculty breakdown ────────────────────────────────────────────────
      if (filteredFacultyBreakdown.length > 0) {
        checkY(30 + filteredFacultyBreakdown.length * 22 + 16);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        setTxt('#e4e4e7');
        doc.text('Faculty Breakdown', ML, y + 12);
        if (selectedMonth !== 'all') {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          setTxt('#71717a');
          doc.text('(filtered)', ML + 120, y + 12);
        }
        y += 22;
        filteredFacultyBreakdown.forEach((f: any, i: number) => {
          checkY(22);
          setFill(i % 2 === 0 ? '#27272a' : '#1f1f23');
          doc.rect(ML, y, CW, 20, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          setTxt('#d4d4d8');
          doc.text(`${f.facultyName}`, ML + 8, y + 13);
          setTxt('#71717a');
          doc.text(`${f.initials} · ${f.subject}`, ML + 8 + doc.getTextWidth(f.facultyName) + 6, y + 13);
          doc.setFont('helvetica', 'bold');
          setTxt('#f4f4f5');
          doc.text(`${f.count} classes`, ML + CW - 8, y + 13, { align: 'right' });
          y += 20;
        });
        y += 16;
      }

      // ── Monthly breakdown ────────────────────────────────────────────────
      if (data.monthlyBreakdown?.length > 0) {
        checkY(30 + data.monthlyBreakdown.length * 22 + 16);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        setTxt('#e4e4e7');
        doc.text('Monthly Breakdown', ML, y + 12);
        y += 22;
        data.monthlyBreakdown.forEach((m: any, i: number) => {
          checkY(22);
          setFill(i % 2 === 0 ? '#27272a' : '#1f1f23');
          doc.rect(ML, y, CW, 20, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          setTxt('#d4d4d8');
          doc.text(`${getMonthName(m._id)} ${m._id.split('-')[0]}`, ML + 8, y + 13);
          doc.setFont('helvetica', 'bold');
          setTxt('#f4f4f5');
          doc.text(`${m.count} classes`, ML + CW - 8, y + 13, { align: 'right' });
          y += 20;
        });
        y += 16;
      }

      // ── Topic history table ──────────────────────────────────────────────
      const topics = filteredTopics;
      if (topics.length > 0) {
        checkY(50);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        setTxt('#e4e4e7');
        const tableTitle = search
          ? `Topic History · "${search}"`
          : selectedMonth !== 'all'
          ? `Topic History · ${monthOptions.find((m: any) => m.value === selectedMonth)?.label}`
          : 'Topic History';
        doc.text(tableTitle, ML, y + 12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        setTxt('#71717a');
        doc.text(`${topics.length} records`, ML + CW, y + 12, { align: 'right' });
        y += 22;

        // Col widths: date | faculty | subject | topic | time
        const colDate = 75;
        const colFac = 55;
        const colSub = 40;
        const colTime = 90;
        const colTopic = CW - colDate - colFac - colSub - colTime;

        // Header row
        setFill('#3f3f46');
        doc.rect(ML, y, CW, 20, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        setTxt('#a1a1aa');
        doc.text('Date',    ML + 4,                              y + 13);
        doc.text('Faculty', ML + colDate + 4,                    y + 13);
        doc.text('Subj',    ML + colDate + colFac + 4,           y + 13);
        doc.text('Topic',   ML + colDate + colFac + colSub + 4,  y + 13);
        doc.text('Time',    ML + CW - 4,                         y + 13, { align: 'right' });
        y += 20;

        topics.forEach((t: any, i: number) => {
          checkY(22);
          if (y === 40) {
            // Fresh page — redraw bg already done in newPage()
          }
          setFill(i % 2 === 0 ? '#27272a' : '#1f1f23');
          doc.rect(ML, y, CW, 20, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');

          setTxt('#a1a1aa');
          doc.text(t.classDateBS ?? '', ML + 4, y + 13);

          setTxt('#a1a1aa');
          doc.text(t.facultyId?.initials ?? '', ML + colDate + 4, y + 13);

          setTxt('#71717a');
          doc.text(t.subject ?? '', ML + colDate + colFac + 4, y + 13);

          setTxt('#e4e4e7');
          const topicText = doc.splitTextToSize(t.topic ?? '', colTopic - 8)[0];
          doc.text(topicText, ML + colDate + colFac + colSub + 4, y + 13);

          setTxt('#71717a');
          doc.text(
            `${t.startTime ?? ''} – ${t.endTime ?? ''}`,
            ML + CW - 4, y + 13, { align: 'right' }
          );
          y += 20;
        });
      }

      // ── Footer on every page ─────────────────────────────────────────────
      const totalPdfPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPdfPages; p++) {
        doc.setPage(p);
        setFill('#18181b');
        doc.rect(0, PH - 28, PW, 28, 'F');
        setTxt('#52525b');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${data.section.name} · Generated ${new Date().toLocaleDateString()}`,
          ML, PH - 12,
        );
        doc.text(`Page ${p} of ${totalPdfPages}`, PW - MR, PH - 12, { align: 'right' });
      }

      doc.save(`${data.section.name}-report.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-zinc-500">Loading...</div>;
  if (!data) return <div className="p-6 text-sm text-zinc-500">Section not found.</div>;

  const { section, totalClasses, facultyBreakdown, monthlyBreakdown } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          {/* Month filter */}
          <select
            value={selectedMonth}
            onChange={e => handleMonthChange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 rounded px-2 py-1.5 focus:outline-none"
          >
            <option value="all">All months</option>
            {monthOptions.map((m: any) => (
              <option key={m.value} value={m.value}>
                {m.label} ({m.count})
              </option>
            ))}
          </select>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {pdfLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Section header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-200 text-sm">
            {section.name.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">{section.name}</h1>
            <p className="text-sm text-zinc-400">
              <span
                className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                  section.status === 'Active'
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {section.status}
              </span>
              {section.remarks}
            </p>
          </div>
          {selectedMonth !== 'all' && (
            <div className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
              {monthOptions.find((m: any) => m.value === selectedMonth)?.label}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
          <div>
            <div className="text-xl font-bold text-zinc-100">{filteredTotalClasses}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {selectedMonth === 'all' && !search ? 'Total Classes' : 'Filtered Classes'}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-zinc-100">{filteredFacultyBreakdown.length}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Faculty Engaged</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['overview', 'topics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${
              activeTab === tab ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'overview' ? 'Overview' : 'Topic History'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Faculty breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-medium text-zinc-200 mb-3">
              Faculty Breakdown
              {selectedMonth !== 'all' && (
                <span className="text-zinc-500 font-normal ml-1">(filtered)</span>
              )}
            </h2>
            <div className="space-y-2">
              {filteredFacultyBreakdown.length === 0 ? (
                <p className="text-xs text-zinc-500">No data.</p>
              ) : filteredFacultyBreakdown.map((f: any) => (
                <div
                  key={f._id}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <div>
                    <span className="text-sm text-zinc-200">{f.facultyName}</span>
                    <span className="text-xs text-zinc-500 ml-2">
                      ({f.initials} · {f.subject})
                    </span>
                  </div>
                  <span className="text-sm font-medium text-zinc-100">{f.count} classes</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly breakdown — clickable to filter */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-medium text-zinc-200 mb-3">Monthly Breakdown</h2>
            <div className="space-y-1">
              {monthlyBreakdown.length === 0 ? (
                <p className="text-xs text-zinc-500">No data.</p>
              ) : monthlyBreakdown.map((m: any) => (
                <div
                  key={m._id}
                  onClick={() => handleMonthChange(selectedMonth === m._id ? 'all' : m._id)}
                  className={`flex items-center justify-between py-2 px-2 border-b border-zinc-800 last:border-0 rounded cursor-pointer transition-colors ${
                    selectedMonth === m._id ? 'bg-zinc-700' : 'hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="text-sm text-zinc-300">
                    {getMonthName(m._id)} {m._id.split('-')[0]}
                  </span>
                  <span className="text-sm font-medium text-zinc-100">{m.count} classes</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">Click a month to filter</p>
          </div>
        </div>
      )}

      {activeTab === 'topics' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {/* Search + count bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search topic, faculty, subject..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-8 pr-8 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
              {search && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-xs text-zinc-500 shrink-0">
              {filteredTopics.length} records
              {selectedMonth !== 'all' && (
                <> · {monthOptions.find((m: any) => m.value === selectedMonth)?.label}</>
              )}
            </span>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="text-left p-3 pl-4 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Faculty</th>
                <th className="text-left p-3 font-medium">Subject</th>
                <th className="text-left p-3 font-medium">Topic</th>
                <th className="text-left p-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {paginatedTopics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-zinc-500">
                    {search || selectedMonth !== 'all' ? 'No records match your filters.' : 'No records.'}
                  </td>
                </tr>
              ) : paginatedTopics.map((t: any) => (
                <tr key={t._id} className="hover:bg-zinc-800/40">
                  <td className="p-3 pl-4 text-zinc-300 font-mono text-xs">{t.classDateBS}</td>
                  <td className="p-3 text-zinc-400 text-xs font-mono">{t.facultyId?.initials}</td>
                  <td className="p-3 text-zinc-500 text-xs">{t.subject}</td>
                  <td className="p-3 text-zinc-200">{t.topic}</td>
                  <td className="p-3 text-zinc-500 text-xs whitespace-nowrap">
                    {t.startTime} – {t.endTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages}
              {filteredTopics.length > 0 && (
                <span className="ml-1 text-zinc-600">
                  · showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredTopics.length)} of {filteredTopics.length}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30 hover:bg-zinc-700 transition-colors"
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30 hover:bg-zinc-700 transition-colors"
              >Prev</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30 hover:bg-zinc-700 transition-colors"
              >Next</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30 hover:bg-zinc-700 transition-colors"
              >»</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}