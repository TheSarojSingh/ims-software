'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useFaculties } from '@/hooks/useFaculties';
import { useSections } from '@/hooks/useSections';
import { useInstitute } from '@/hooks/useInstitute';
import { getTodayBS } from '@/lib/date/bs-date';
import { Plus, Trash2, Check, Loader2, ArrowLeft } from 'lucide-react';

function to24h(t: string) {
  if (!t) return '';
  const c = t.trim().toUpperCase().replace(/\s/g,'');
  const isPM = c.includes('PM'); const isAM = c.includes('AM');
  const n = c.replace('AM','').replace('PM','');
  const [hS,mS] = n.split(':'); let h = parseInt(hS,10); const m = parseInt(mS||'0',10);
  if(isPM&&h!==12)h+=12; if(isAM&&h===12)h=0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function toDisplay(t24:string) {
  if(!t24)return'';
  const[hS,mS]=t24.split(':'); const h=parseInt(hS,10); const m=parseInt(mS,10);
  const isPM=h>=12; const hour=h%12||12;
  return `${hour}:${String(m).padStart(2,'0')}${isPM?'PM':'AM'}`;
}

interface SlotRow { id: number; facultyId: string; subject: string; topic: string; startTime: string; endTime: string; }

let nextId = 1;
const newRow = (): SlotRow => ({ id: nextId++, facultyId: '', subject: '', topic: '', startTime: '', endTime: '' });

export default function BulkEntryPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { apiHeaders } = useInstitute();
  const { data: sections  = [] } = useSections();
  const { data: faculties = [] } = useFaculties();

  const [sectionId,   setSectionId]   = useState('');
  const [classDateBS, setClassDateBS] = useState(getTodayBS());
  const [slots,       setSlots]       = useState<SlotRow[]>([newRow()]);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  const updateSlot = (id: number, key: keyof SlotRow, value: string) => {
    setSlots(prev => prev.map(s => {
      if (s.id !== id) return s;
      const next = { ...s, [key]: value };
      if (key === 'facultyId') {
        const fac = faculties.find((f: any) => f._id === value);
        next.subject = fac?.subject ?? '';
      }
      return next;
    }));
  };

  const addRow    = () => setSlots(prev => [...prev, newRow()]);
  const removeRow = (id: number) => setSlots(prev => prev.filter(s => s.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId) { setError('Select a section'); return; }
    const validSlots = slots.filter(s => s.facultyId && s.topic && s.startTime && s.endTime);
    if (!validSlots.length) { setError('At least one complete slot is required'); return; }

    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/classes/bulk', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          sectionId,
          classDateBS,
          slots: validSlots.map(s => ({
            facultyId: s.facultyId,
            subject:   s.subject,
            topic:     s.topic,
            startTime: s.startTime,
            endTime:   s.endTime,
          })),
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      qc.invalidateQueries({ queryKey: ['classes'] });
      alert(`${d.count} classes saved successfully.`);
      router.push('/dashboard/classes');
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-300"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Bulk Entry</h1>
          <p className="text-sm text-zinc-400">Add multiple classes for one section and date</p>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 px-4 py-3 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Date (B.S.)</label>
            <input value={classDateBS} onChange={e => setClassDateBS(e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none font-mono" placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Section</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none">
              <option value="">Select section</option>
              {sections.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Slot rows */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-200">Class Slots <span className="text-zinc-500 font-normal ml-1">({slots.length})</span></h2>
            <button type="button" onClick={addRow}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-2.5 py-1.5 rounded-md transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left p-3 pl-4 font-medium">Faculty</th>
                  <th className="text-left p-3 font-medium">Subject</th>
                  <th className="text-left p-3 font-medium">Topic</th>
                  <th className="text-left p-3 font-medium">Start</th>
                  <th className="text-left p-3 font-medium">End</th>
                  <th className="p-3 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {slots.map(slot => (
                  <tr key={slot.id} className="hover:bg-zinc-800/30">
                    <td className="p-2 pl-4">
                      <select value={slot.facultyId} onChange={e => updateSlot(slot.id, 'facultyId', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none min-w-44">
                        <option value="">Select faculty</option>
                        {faculties.map((f: any) => <option key={f._id} value={f._id}>[{f.subject}-{f.initials}] {f.fullName}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input value={slot.subject} onChange={e => updateSlot(slot.id, 'subject', e.target.value.toUpperCase())}
                        className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none uppercase" placeholder="M" />
                    </td>
                    <td className="p-2">
                      <input value={slot.topic} onChange={e => updateSlot(slot.id, 'topic', e.target.value)}
                        className="w-full min-w-40 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none" placeholder="Topic..." />
                    </td>
                    <td className="p-2">
                      <input type="time" value={to24h(slot.startTime)} onChange={e => updateSlot(slot.id, 'startTime', toDisplay(e.target.value))}
                        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none font-mono w-28" />
                    </td>
                    <td className="p-2">
                      <input type="time" value={to24h(slot.endTime)} onChange={e => updateSlot(slot.id, 'endTime', toDisplay(e.target.value))}
                        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none font-mono w-28" />
                    </td>
                    <td className="p-2 pr-4">
                      <button type="button" onClick={() => removeRow(slot.id)} disabled={slots.length === 1}
                        className="p-1.5 rounded hover:bg-red-950 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-20">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={addRow}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-3 py-2 rounded-md transition-colors">
            <Plus className="w-4 h-4" /> Add another slot
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-5 py-2.5 rounded-md transition-colors disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {submitting ? 'Saving...' : `Save ${slots.filter(s => s.facultyId && s.topic).length} Classes`}
          </button>
        </div>
      </form>
    </div>
  );
}