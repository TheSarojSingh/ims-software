'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2, LayoutGrid, AlertTriangle, Users, X, Search, Pencil, Check, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { getTodayBS } from '@/lib/date/bs-date';
import { useInstitute } from '@/hooks/useInstitute';

function parseMinutes(t: string): number {
  const c = t.trim().toUpperCase().replace(/\s/g, '');
  const isPM = c.includes('PM'); const isAM = c.includes('AM');
  const n = c.replace('AM', '').replace('PM', '');
  const [hS, mS] = n.split(':');
  let h = parseInt(hS, 10); const m = parseInt(mS || '0', 10);
  if (isPM && h !== 12) h += 12; if (isAM && h === 12) h = 0;
  return h * 60 + m;
}
function durationLabel(s: string, e: string) {
  const d = parseMinutes(e) - parseMinutes(s);
  if (d <= 0) return '—';
  const h = Math.floor(d / 60); const m = d % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function to24h(t: string) {
  if (!t) return '';
  const c = t.trim().toUpperCase().replace(/\s/g, '');
  const isPM = c.includes('PM'); const isAM = c.includes('AM');
  const n = c.replace('AM', '').replace('PM', '');
  const [hS, mS] = n.split(':');
  let h = parseInt(hS, 10); const m = parseInt(mS || '0', 10);
  if (isPM && h !== 12) h += 12; if (isAM && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function toDisplay(t24: string) {
  if (!t24) return '';
  const [hS, mS] = t24.split(':');
  const h = parseInt(hS, 10); const m = parseInt(mS, 10);
  const isPM = h >= 12; const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')}${isPM ? 'PM' : 'AM'}`;
}

const PAGE_SIZE = 15;

export default function ClassRecordsPage() {
  const qc = useQueryClient();
  const { instituteId, apiHeaders } = useInstitute();
  const [currentDate,      setCurrentDate]      = useState(getTodayBS());
  const [deleting,         setDeleting]          = useState<string | null>(null);
  const [deletingAll,      setDeletingAll]       = useState(false);
  const [selectedSection,  setSelectedSection]   = useState('all');
  const [teacherSearch,    setTeacherSearch]     = useState('');
  const [page,             setPage]              = useState(1);
  const [showTeacherModal, setShowTeacherModal]  = useState(false);
  const [editingClass,     setEditingClass]      = useState<string | null>(null);
  const [editForm,         setEditForm]          = useState({ topic: '', subject: '', startTime: '', endTime: '', remarks: '' });
  const [saving,           setSaving]            = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['classes', instituteId, currentDate],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const res = await fetch(`/api/classes?classDateBS=${currentDate}&limit=500`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d;
    },
  });

  const classes = data?.data ?? [];

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class record?')) return;
    setDeleting(id);
    await fetch(`/api/classes/${id}`, { method: 'DELETE', headers: apiHeaders() });
    qc.invalidateQueries({ queryKey: ['classes', instituteId] });
    setDeleting(null);
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete ALL ${classes.length} class records for ${currentDate}?`)) return;
    setDeletingAll(true);
    try {
      const res = await fetch(`/api/classes?classDateBS=${currentDate}`, { method: 'DELETE', headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      qc.invalidateQueries({ queryKey: ['classes', instituteId] });
    } catch (e: any) { alert(e.message); }
    finally { setDeletingAll(false); }
  };

  const startEdit = (c: any) => {
    setEditingClass(c._id);
    setEditForm({ topic: c.topic ?? '', subject: c.subject ?? '', startTime: c.startTime ?? '', endTime: c.endTime ?? '', remarks: c.remarks ?? '' });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'PATCH', headers: apiHeaders(), body: JSON.stringify(editForm) });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      qc.invalidateQueries({ queryKey: ['classes', instituteId] });
      setEditingClass(null);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const changeDate = (delta: number) => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const nd = d + delta;
    if (nd < 1)  { const nm = m - 1; setCurrentDate(nm < 1 ? `${y-1}-12-30` : `${y}-${String(nm).padStart(2,'0')}-30`); }
    else if (nd > 32) { const nm = m + 1; setCurrentDate(nm > 12 ? `${y+1}-01-01` : `${y}-${String(nm).padStart(2,'0')}-01`); }
    else setCurrentDate(`${y}-${String(m).padStart(2,'0')}-${String(nd).padStart(2,'0')}`);
    setPage(1); setSelectedSection('all'); setTeacherSearch(''); setEditingClass(null);
  };

  const teacherSummary = useMemo(() => {
    const counts: Record<string, any> = {};
    classes.forEach((c: any) => {
      const key = c.facultyId?._id ?? 'unknown';
      if (!counts[key]) counts[key] = { name: c.facultyId?.fullName ?? 'Unknown', initials: c.facultyId?.initials ?? '?', subject: c.subject ?? '', count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a: any, b: any) => b.count - a.count);
  }, [classes]);

  const sectionList = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c: any) => { if (c.sectionId?.name) set.add(c.sectionId.name); });
    return Array.from(set).sort();
  }, [classes]);

  const filtered = useMemo(() => {
    let list = classes;
    if (selectedSection !== 'all') list = list.filter((c: any) => c.sectionId?.name === selectedSection);
    if (teacherSearch.trim()) {
      const q = teacherSearch.trim().toLowerCase();
      list = list.filter((c: any) => c.facultyId?.fullName?.toLowerCase().includes(q) || c.facultyId?.initials?.toLowerCase().includes(q));
    }
    return list;
  }, [classes, selectedSection, teacherSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  if (!instituteId) return <div className="p-6 text-sm text-zinc-500">Select an institute from the sidebar.</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Class Records</h1>
          <p className="text-sm text-zinc-400">View, add, and manage class entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/classes/manual" className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-md transition-colors">
            <Plus className="w-4 h-4" /> Manual
          </Link>
          <Link href="/dashboard/classes/bulk" className="flex items-center gap-2 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium px-3 py-2 rounded-md transition-colors">
            <LayoutGrid className="w-4 h-4" /> Bulk
          </Link>
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3 w-fit">
        <button onClick={() => changeDate(-1)} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex items-center gap-2">
          <input type="text" value={currentDate} onChange={e => { setCurrentDate(e.target.value); setPage(1); }}
            className="bg-transparent text-sm font-mono text-zinc-200 focus:outline-none w-28 text-center" />
          <span className="text-xs text-zinc-500">B.S.</span>
        </div>
        <button onClick={() => changeDate(1)} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => { setCurrentDate(getTodayBS()); setPage(1); }} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-700">Today</button>
      </div>

      {classes.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <ClipboardList className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Total:</span>
            <span className="text-xs font-bold text-zinc-100">{classes.length}</span>
          </div>
          <button onClick={() => setShowTeacherModal(true)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 transition-colors">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">By teacher</span>
            <span className="text-xs font-bold text-zinc-100">{teacherSummary.length}</span>
          </button>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-zinc-200">{filtered.length} classes{(selectedSection !== 'all' || teacherSearch) ? ' (filtered)' : ` on ${currentDate}`}</span>
            <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setPage(1); }}
              className="bg-zinc-800 text-xs text-zinc-200 border border-zinc-700 rounded px-2 py-1">
              <option value="all">All sections</option>
              {sectionList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={teacherSearch} onChange={e => { setTeacherSearch(e.target.value); setPage(1); }} placeholder="Search teacher..."
                className="bg-zinc-800 border border-zinc-700 rounded pl-6 pr-6 py-1 text-xs text-zinc-200 focus:outline-none w-36" />
              {teacherSearch && <button onClick={() => { setTeacherSearch(''); setPage(1); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500"><X className="w-3 h-3" /></button>}
            </div>
          </div>
          {classes.length > 0 && (
            <button onClick={handleDeleteAll} disabled={deletingAll}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 border border-red-900/40 px-2.5 py-1.5 rounded-md hover:bg-red-950/20 transition-colors disabled:opacity-40">
              <AlertTriangle className="w-3 h-3" />
              {deletingAll ? 'Deleting...' : `Delete all (${classes.length})`}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="text-left p-3 pl-4 font-medium">Start</th>
                <th className="text-left p-3 font-medium">End</th>
                <th className="text-left p-3 font-medium">Dur</th>
                <th className="text-left p-3 font-medium">Section</th>
                <th className="text-left p-3 font-medium">Faculty</th>
                <th className="text-left p-3 font-medium">Subject</th>
                <th className="text-left p-3 font-medium">Topic</th>
                <th className="text-left p-3 font-medium">Remarks</th>
                <th className="text-right p-3 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={9} className="p-6 text-center text-xs text-zinc-500">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center">
                  <div className="text-zinc-500 text-sm">{teacherSearch || selectedSection !== 'all' ? 'No classes match filters.' : 'No classes on this date.'}</div>
                  {!teacherSearch && selectedSection === 'all' && (
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Link href="/dashboard/classes/manual" className="text-xs text-zinc-400 hover:text-zinc-200 underline">Manual Entry</Link>
                      <span className="text-zinc-600">·</span>
                      <Link href="/dashboard/classes/bulk" className="text-xs text-zinc-400 hover:text-zinc-200 underline">Bulk Entry</Link>
                    </div>
                  )}
                </td></tr>
              ) : paginated.map((c: any) => {
                const isEditing = editingClass === c._id;
                return (
                  <tr key={c._id} className={`hover:bg-zinc-800/40 ${isEditing ? 'bg-zinc-800/60' : ''}`}>
                    {isEditing ? (
                      <>
                        <td className="p-2 pl-4"><input type="time" value={to24h(editForm.startTime)} onChange={e => setEditForm(f => ({ ...f, startTime: toDisplay(e.target.value) }))} className="bg-zinc-700 border border-zinc-600 rounded px-1.5 py-1 text-xs text-zinc-100 focus:outline-none font-mono w-24" /></td>
                        <td className="p-2"><input type="time" value={to24h(editForm.endTime)} onChange={e => setEditForm(f => ({ ...f, endTime: toDisplay(e.target.value) }))} className="bg-zinc-700 border border-zinc-600 rounded px-1.5 py-1 text-xs text-zinc-100 focus:outline-none font-mono w-24" /></td>
                        <td className="p-2 text-zinc-600">{durationLabel(editForm.startTime, editForm.endTime)}</td>
                        <td className="p-2 text-zinc-400">{c.sectionId?.name}</td>
                        <td className="p-2"><div className="font-mono font-bold text-zinc-200">{c.facultyId?.initials}</div></td>
                        <td className="p-2"><input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value.toUpperCase() }))} className="bg-zinc-700 border border-zinc-600 rounded px-1.5 py-1 text-xs text-zinc-100 focus:outline-none uppercase w-12" /></td>
                        <td className="p-2"><input value={editForm.topic} onChange={e => setEditForm(f => ({ ...f, topic: e.target.value }))} className="bg-zinc-700 border border-zinc-600 rounded px-1.5 py-1 text-xs text-zinc-100 focus:outline-none w-40" /></td>
                        <td className="p-2"><input value={editForm.remarks} onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))} className="bg-zinc-700 border border-zinc-600 rounded px-1.5 py-1 text-xs text-zinc-100 focus:outline-none w-32" /></td>
                        <td className="p-2 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => saveEdit(c._id)} disabled={saving} className="p-1.5 rounded bg-emerald-900/50 hover:bg-emerald-900 text-emerald-400 disabled:opacity-40"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingClass(null)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 pl-4 text-zinc-400 font-mono whitespace-nowrap">{c.startTime}</td>
                        <td className="p-3 text-zinc-500 font-mono whitespace-nowrap">{c.endTime}</td>
                        <td className="p-3 text-zinc-600">{durationLabel(c.startTime, c.endTime)}</td>
                        <td className="p-3 text-zinc-300">{c.sectionId?.name}</td>
                        <td className="p-3"><div className="font-mono font-bold text-zinc-200">{c.facultyId?.initials}</div><div className="text-[10px] text-zinc-500">{c.facultyId?.fullName}</div></td>
                        <td className="p-3 text-zinc-500 uppercase font-mono">{c.subject}</td>
                        <td className="p-3 text-zinc-200">{c.topic}</td>
                        <td className="p-3 text-zinc-500 italic text-[11px]">{c.remarks || <span className="text-zinc-700">—</span>}</td>
                        <td className="p-3 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(c)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-200"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(c._id)} disabled={deleting === c._id} className="p-1.5 rounded hover:bg-red-950 text-zinc-600 hover:text-red-400 disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800">
          <span className="text-xs text-zinc-400">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {showTeacherModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Classes by Teacher</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{currentDate} · {classes.length} total</p>
              </div>
              <button onClick={() => setShowTeacherModal(false)} className="text-zinc-500 hover:text-zinc-200 p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-1 max-h-80 overflow-y-auto">
              {teacherSummary.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-zinc-800 rounded-md flex items-center justify-center">
                      <span className="text-[10px] font-bold text-zinc-300">{t.subject}</span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-200">{t.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{t.subject}-{t.initials}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-100">{t.count}</div>
                    <div className="text-[10px] text-zinc-600">classes</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-zinc-800">
              <button onClick={() => setShowTeacherModal(false)} className="w-full text-xs text-zinc-400 hover:text-zinc-200 py-1.5 rounded hover:bg-zinc-800 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}