'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFaculties } from '@/hooks/useFaculties';
import { useSections } from '@/hooks/useSections';
import { useInstitute } from '@/hooks/useInstitute';
import { getTodayBS } from '@/lib/date/bs-date';
import { Loader2, Check, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

function to24h(t: string) {
  if (!t) return '';
  const c = t.trim().toUpperCase().replace(/\s/g, '');
  const isPM = c.includes('PM'); const isAM = c.includes('AM');
  const n = c.replace('AM','').replace('PM','');
  const [hS, mS] = n.split(':'); let h = parseInt(hS, 10); const m = parseInt(mS||'0', 10);
  if (isPM && h !== 12) h += 12; if (isAM && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function toDisplay(t24: string) {
  if (!t24) return '';
  const [hS, mS] = t24.split(':'); const h = parseInt(hS, 10); const m = parseInt(mS, 10);
  const isPM = h >= 12; const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')}${isPM ? 'PM' : 'AM'}`;
}

const emptyForm = { sectionId: '', facultyId: '', subject: '', topic: '', startTime: '', endTime: '', classDateBS: getTodayBS(), remarks: '' };

export default function ManualEntryPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { apiHeaders } = useInstitute();
  const { data: sections  = [] } = useSections();
  const { data: faculties = [] } = useFaculties();
  const [form,       setForm]       = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');

  const selectedFaculty = faculties.find((f: any) => f._id === form.facultyId);

  const set = (key: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'facultyId') {
        const fac = faculties.find((f: any) => f._id === value);
        next.subject = fac?.subject ?? '';
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(''); setSuccess(false);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST', headers: apiHeaders(), body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setSuccess(true);
      setForm({ ...emptyForm, classDateBS: form.classDateBS, sectionId: form.sectionId });
      qc.invalidateQueries({ queryKey: ['classes'] });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-300"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Manual Entry</h1>
          <p className="text-sm text-zinc-400">Record a single class</p>
        </div>
      </div>

      {success && <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 text-emerald-400 text-sm px-4 py-3 rounded-lg"><Check className="w-4 h-4" /> Class saved.</div>}
      {error   && <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 px-4 py-3 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Date (B.S.)</label>
            <input value={form.classDateBS} onChange={e => set('classDateBS', e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none font-mono" placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Section</label>
            <select value={form.sectionId} onChange={e => set('sectionId', e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none">
              <option value="">Select section</option>
              {sections.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Faculty</label>
            <select value={form.facultyId} onChange={e => set('facultyId', e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none">
              <option value="">Select faculty</option>
              {faculties.map((f: any) => <option key={f._id} value={f._id}>[{f.subject}-{f.initials}] {f.fullName}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Subject</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none uppercase"
              placeholder={selectedFaculty ? `Auto: ${selectedFaculty.subject}` : 'Subject code'} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Start Time</label>
            <input type="time" value={to24h(form.startTime)} onChange={e => set('startTime', toDisplay(e.target.value))} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none font-mono" />
            {form.startTime && <div className="text-[10px] text-zinc-500">{form.startTime}</div>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">End Time</label>
            <input type="time" value={to24h(form.endTime)} onChange={e => set('endTime', toDisplay(e.target.value))} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none font-mono" />
            {form.endTime && <div className="text-[10px] text-zinc-500">{form.endTime}</div>}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Topic</label>
          <input value={form.topic} onChange={e => set('topic', e.target.value)} required
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none" placeholder="e.g. Differential Equations" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Remarks (optional)</label>
          <input value={form.remarks} onChange={e => set('remarks', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Class
          </button>
        </div>
      </form>
    </div>
  );
}