'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, ChevronRight, Loader2, X, Check, UserX, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useInstitute } from '@/hooks/useInstitute';

interface Faculty {
  _id: string; fullName: string; initials: string;
  phone: string; subject: string; isActive: boolean;
  username?: string;
}

const emptyForm = { fullName: '', initials: '', phone: '', subject: '' };

export default function FacultyPage() {
  const queryClient              = useQueryClient();
  const { instituteId, apiHeaders } = useInstitute();
  const [search,       setSearch]       = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [formData,     setFormData]     = useState(emptyForm);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [togglingId,   setTogglingId]   = useState<string | null>(null);
  const [error,        setError]        = useState('');

  const { data: faculties = [], isLoading } = useQuery<Faculty[]>({
    queryKey: ['faculties', instituteId, search, showInactive],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const p = new URLSearchParams({ search });
      if (showInactive) p.set('includeInactive', 'true');
      const res = await fetch(`/api/faculties?${p}`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const url    = editingId ? `/api/faculties/${editingId}` : '/api/faculties';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: apiHeaders(), body: JSON.stringify(formData),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setFormData(emptyForm); setShowForm(false); setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['faculties', instituteId] });
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (f: Faculty) => {
    setFormData({ fullName: f.fullName, initials: f.initials, phone: f.phone, subject: f.subject });
    setEditingId(f._id); setShowForm(true); setError('');
  };

  const handleToggleActive = async (f: Faculty) => {
    if (!confirm(`${f.isActive ? 'Deactivate' : 'Reactivate'} ${f.fullName}?`)) return;
    setTogglingId(f._id);
    try {
      const res = await fetch(`/api/faculties/${f._id}`, {
        method: 'PATCH', headers: apiHeaders(),
        body: JSON.stringify({ isActive: !f.isActive }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      queryClient.invalidateQueries({ queryKey: ['faculties', instituteId] });
    } catch (err: any) { alert(err.message); }
    finally { setTogglingId(null); }
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setFormData(emptyForm); setError(''); };

  const active   = faculties.filter(f =>  f.isActive);
  const inactive = faculties.filter(f => !f.isActive);

  if (!instituteId) return (
    <div className="p-6 text-sm text-zinc-500">Select an institute from the sidebar.</div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Faculty</h1>
          <p className="text-sm text-zinc-400">Manage instructor profiles</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData(emptyForm); }}
          className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-3 py-2 rounded-md transition-colors">
          <Plus className="w-4 h-4" /> Add Faculty
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-100">{editingId ? 'Edit Faculty' : 'Add Faculty'}</h2>
            <button onClick={cancel} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'fullName', label: 'Full Name', placeholder: 'Ram Sharma', upper: false },
              { key: 'initials', label: 'Initials',  placeholder: 'RS',         upper: true },
              { key: 'subject',  label: 'Subject Code', placeholder: 'M, P, C...', upper: true },
              { key: 'phone',    label: 'Phone',     placeholder: '98XXXXXXXX', upper: false },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs text-zinc-400">{f.label}</label>
                <input required value={(formData as any)[f.key]}
                  onChange={e => setFormData(p => ({ ...p, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                  placeholder={f.placeholder} />
              </div>
            ))}
            <div className="col-span-2 md:col-span-4 flex justify-end gap-2 mt-1">
              <button type="button" onClick={cancel} className="text-sm text-zinc-400 px-3 py-2">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search faculty..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
        </div>
        <button onClick={() => setShowInactive(v => !v)}
          className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg border transition-colors whitespace-nowrap ${
            showInactive ? 'bg-zinc-700 border-zinc-600 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}>
          <UserX className="w-3.5 h-3.5" />
          {showInactive ? 'Showing all' : 'Show inactive'}
        </button>
      </div>

      <FacultyTable faculties={active} isLoading={isLoading} togglingId={togglingId} onEdit={handleEdit} onToggle={handleToggleActive} />

      {showInactive && inactive.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider px-2">Inactive ({inactive.length})</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          <FacultyTable faculties={inactive} isLoading={false} togglingId={togglingId} onEdit={handleEdit} onToggle={handleToggleActive} dimmed />
        </div>
      )}
    </div>
  );
}

function FacultyTable({ faculties, isLoading, togglingId, onEdit, onToggle, dimmed = false }:
  { faculties: Faculty[]; isLoading: boolean; togglingId: string | null; onEdit: (f: Faculty) => void; onToggle: (f: Faculty) => void; dimmed?: boolean }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden ${dimmed ? 'opacity-60' : ''}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-500">
            <th className="text-left p-3 pl-4 font-medium">ID</th>
            <th className="text-left p-3 font-medium">Name</th>
            <th className="text-left p-3 font-medium">Phone</th>
            <th className="text-left p-3 font-medium">Portal</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 pr-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {isLoading ? (
            <tr><td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">Loading...</td></tr>
          ) : faculties.length === 0 ? (
            <tr><td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">No faculty found.</td></tr>
          ) : faculties.map(f => (
            <tr key={f._id} className="hover:bg-zinc-800/40 transition-colors">
              <td className="p-3 pl-4 font-mono font-bold text-zinc-200 text-xs">{f.subject}-{f.initials}</td>
              <td className="p-3 text-zinc-200">{f.fullName}</td>
              <td className="p-3 text-zinc-400 font-mono text-xs">{f.phone}</td>
              <td className="p-3">
                {f.username
                  ? <span className="text-xs text-emerald-400 font-mono">{f.username}</span>
                  : <span className="text-xs text-zinc-600">—</span>}
              </td>
              <td className="p-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${f.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {f.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="p-3 pr-4">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onEdit(f)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onToggle(f)} disabled={togglingId === f._id} title={f.isActive ? 'Deactivate' : 'Reactivate'}
                    className={`p-1.5 rounded transition-colors disabled:opacity-40 ${f.isActive ? 'hover:bg-red-950 text-zinc-500 hover:text-red-400' : 'hover:bg-emerald-950 text-zinc-500 hover:text-emerald-400'}`}>
                    {togglingId === f._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : f.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                  <Link href={`/dashboard/faculties/${f._id}`} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}