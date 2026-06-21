'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronRight, Loader2, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useInstitute } from '@/hooks/useInstitute';

interface Section { _id: string; name: string; status: 'Active' | 'Inactive'; remarks?: string; }

// ── Explicit union type so TypeScript allows both 'Active' and 'Inactive' ──
interface SectionForm { name: string; status: 'Active' | 'Inactive'; remarks: string; }
const emptyForm: SectionForm = { name: '', status: 'Active', remarks: '' };

export default function SectionsPage() {
  const qc = useQueryClient();
  const { instituteId, apiHeaders } = useInstitute();
  const [showForm,   setShowForm]   = useState(false);
  const [formData,   setFormData]   = useState<SectionForm>(emptyForm);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: ['sections', 'all', instituteId],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const res = await fetch('/api/sections?all=true', { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const url    = editingId ? `/api/sections/${editingId}` : '/api/sections';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(formData) });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      setFormData(emptyForm); setShowForm(false); setEditingId(null);
      qc.invalidateQueries({ queryKey: ['sections'] });
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (s: Section) => {
    // status is 'Active' | 'Inactive' — now correctly assignable to SectionForm
    setFormData({ name: s.name, status: s.status, remarks: s.remarks ?? '' });
    setEditingId(s._id); setShowForm(true); setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this section?')) return;
    await fetch(`/api/sections/${id}`, { method: 'DELETE', headers: apiHeaders() });
    qc.invalidateQueries({ queryKey: ['sections'] });
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setFormData(emptyForm); setError(''); };

  if (!instituteId) return <div className="p-6 text-sm text-zinc-500">Select an institute from the sidebar.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Sections</h1>
          <p className="text-sm text-zinc-400">Manage academic batches and sections</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData(emptyForm); }}
          className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-3 py-2 rounded-md transition-colors">
          <Plus className="w-4 h-4" /> Add Section
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-100">{editingId ? 'Edit Section' : 'Add Section'}</h2>
            <button onClick={cancel} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Section Name</label>
              <input required value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none" placeholder="M2, D1..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Status</label>
              <select value={formData.status}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Remarks (optional)</label>
              <input value={formData.remarks}
                onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none" placeholder="Morning batch..." />
            </div>
            <div className="col-span-1 md:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={cancel} className="text-sm text-zinc-400 px-3 py-2">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-500">
              <th className="text-left p-3 pl-4 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Remarks</th>
              <th className="text-right p-3 pr-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading ? (
              <tr><td colSpan={4} className="p-6 text-center text-zinc-500 text-xs">Loading...</td></tr>
            ) : sections.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-zinc-500 text-xs">No sections yet.</td></tr>
            ) : sections.map(s => (
              <tr key={s._id} className="hover:bg-zinc-800/40">
                <td className="p-3 pl-4 font-medium text-zinc-200">{s.name}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'Active' ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>{s.status}</span>
                </td>
                <td className="p-3 text-zinc-500 text-xs">{s.remarks || '—'}</td>
                <td className="p-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleEdit(s)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(s._id)} className="p-1.5 rounded hover:bg-red-950 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    <Link href={`/dashboard/sections/${s._id}`} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200"><ChevronRight className="w-3.5 h-3.5" /></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}