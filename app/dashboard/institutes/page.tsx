'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, X, Check, Loader2, Building2,
  Power, Globe, AlertCircle,
} from 'lucide-react';
import { useInstitute } from '@/hooks/useInstitute';

interface Institute {
  _id: string; name: string; shortName: string;
  address: string; phone: string; isActive: boolean;
  createdAt: string;
}

const emptyForm = { name: '', shortName: '', address: '', phone: '' };

export default function InstitutesPage() {
  const qc = useQueryClient();
  const { setActiveInstitute } = useInstitute();
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [toggling,   setToggling]   = useState<string | null>(null);

  const { data: institutes = [], isLoading } = useQuery<Institute[]>({
    queryKey: ['institutes'],
    queryFn:  async () => {
      const res = await fetch('/api/institutes');
      const d   = await res.json();
      return d.success ? d.data : [];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['institutes'] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryClient = qc;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const url    = editingId ? `/api/institutes/${editingId}` : '/api/institutes';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setForm(emptyForm); setShowForm(false); setEditingId(null);
      refresh();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (inst: Institute) => {
    const action = inst.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${inst.name}"?`)) return;
    setToggling(inst._id);
    try {
      const res = await fetch(`/api/institutes/${inst._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: !inst.isActive }),
      });
      const d = await res.json();
      if (d.success) refresh();
      else throw new Error(d.error);
    } catch (err: any) { alert(err.message); }
    finally { setToggling(null); }
  };

  const startEdit = (inst: Institute) => {
    setForm({ name: inst.name, shortName: inst.shortName, address: inst.address || '', phone: inst.phone || '' });
    setEditingId(inst._id);
    setShowForm(true);
    setError('');
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setError(''); };

  const active   = institutes.filter(i =>  i.isActive);
  const inactive = institutes.filter(i => !i.isActive);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Global admin page header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-100">Institute Management</h1>
                <span className="text-[9px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">Global</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Institutes are the top-level containers for all data. Each has its own faculty, sections, and class records.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> New Institute
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-800">
          <div>
            <div className="text-xl font-bold text-zinc-100">{institutes.length}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Total Institutes</div>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400">{active.length}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Active</div>
          </div>
          <div>
            <div className="text-xl font-bold text-zinc-600">{inactive.length}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Inactive</div>
          </div>
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-100">
              {editingId ? 'Edit Institute' : 'Create New Institute'}
            </h2>
            <button onClick={cancel} className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2 rounded-lg mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {[
              { key: 'name',      label: 'Full Name',  placeholder: 'Bright Future Institute', required: true },
              { key: 'shortName', label: 'Short Name', placeholder: 'BFI',                    required: true },
              { key: 'address',   label: 'Address',    placeholder: 'Kathmandu, Nepal',        required: false },
              { key: 'phone',     label: 'Phone',      placeholder: '01-XXXXXXX',              required: false },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  required={f.required}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div className="col-span-2 flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={cancel} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? 'Save Changes' : 'Create Institute'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active institutes */}
      {isLoading ? (
        <div className="text-sm text-zinc-500 text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-3">
          {institutes.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No institutes yet.</p>
              <p className="text-xs text-zinc-600 mt-1">Create your first institute to get started.</p>
            </div>
          )}

          {active.map(inst => (
            <InstituteCard
              key={inst._id}
              inst={inst}
              toggling={toggling}
              onEdit={startEdit}
              onToggle={handleToggle}
              onSelect={() => setActiveInstitute(inst as any)}
            />
          ))}

          {inactive.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider px-2 font-medium">
                  Inactive ({inactive.length})
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              {inactive.map(inst => (
                <InstituteCard
                  key={inst._id}
                  inst={inst}
                  toggling={toggling}
                  onEdit={startEdit}
                  onToggle={handleToggle}
                  onSelect={() => {}}
                  dimmed
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InstituteCard({
  inst, toggling, onEdit, onToggle, onSelect, dimmed = false,
}: {
  inst: Institute;
  toggling: string | null;
  onEdit:   (i: Institute) => void;
  onToggle: (i: Institute) => void;
  onSelect: () => void;
  dimmed?:  boolean;
}) {
  return (
    <div className={`bg-zinc-900 border rounded-xl p-4 transition-opacity ${
      dimmed ? 'opacity-50 border-zinc-800' : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-zinc-200">{inst.shortName.slice(0, 2)}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-100 truncate">{inst.name}</h3>
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
              {inst.shortName}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {[inst.address, inst.phone].filter(Boolean).join(' · ') || 'No contact info'}
          </p>
        </div>

        {/* Status badge */}
        <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
          inst.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
        }`}>
          {inst.isActive ? 'Active' : 'Inactive'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {inst.isActive && (
            <button
              onClick={onSelect}
              className="text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Switch to
            </button>
          )}
          <button
            onClick={() => onEdit(inst)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggle(inst)}
            disabled={toggling === inst._id}
            title={inst.isActive ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
              inst.isActive
                ? 'hover:bg-red-950/40 text-zinc-500 hover:text-red-400'
                : 'hover:bg-emerald-950/40 text-zinc-500 hover:text-emerald-400'
            }`}
          >
            {toggling === inst._id
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Power className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}