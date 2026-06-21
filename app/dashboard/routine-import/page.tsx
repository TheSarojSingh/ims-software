'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, Loader2, CheckCircle2, History, X,
  ExternalLink, Eye, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import RoutineValidationGrid from '@/features/routine/components/RoutineValidationGrid';
import { useRouter } from 'next/navigation';
import { useInstitute } from '@/hooks/useInstitute';

const HIST_PAGE_SIZE = 10;
const truncateUrl = (url: string) => url.length > 60 ? url.slice(0, 60) + '...' : url;

export default function RoutineImportPage() {
  const router       = useRouter();
  const qc           = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { instituteId, apiHeaders, apiHeadersForm } = useInstitute();

  const [tab,       setTab]       = useState<'upload' | 'history'>('upload');
  const [histPage,  setHistPage]  = useState(1);

  // Upload flow
  const [selectedFile,    setSelectedFile]    = useState<File | null>(null);
  const [routineImageUrl, setRoutineImageUrl] = useState('');
  const [customPrompt,    setCustomPrompt]    = useState('');
  const [isExtracting,    setIsExtracting]    = useState(false);
  const [isCommitting,    setIsCommitting]    = useState(false);
  const [importId,        setImportId]        = useState<string | null>(null);
  const [extractedData,   setExtractedData]   = useState<{ classDateBS: string; slots: any[] } | null>(null);
  const [error,           setError]           = useState('');

  // History viewer
  const [viewingImport,        setViewingImport]        = useState<{ classDateBS: string; slots: any[] } | null>(null);
  const [viewingFileName,      setViewingFileName]      = useState('');
  const [viewingImportId,      setViewingImportId]      = useState<string | null>(null);
  const [viewingStatus,        setViewingStatus]        = useState('');
  const [viewingCommitted,     setViewingCommitted]     = useState<any[]>([]);
  const [loadingViewId,        setLoadingViewId]        = useState<string | null>(null);
  const [isReconfirming,       setIsReconfirming]       = useState(false);

  const { data: historyRaw = [], isLoading: histLoading } = useQuery({
    queryKey: ['routineImports', instituteId],
    enabled:  tab === 'history' && !!instituteId,
    queryFn:  async () => {
      const res = await fetch('/api/routine-import', { headers: apiHeaders() });
      const d   = await res.json();
      return d.success ? d.data : [];
    },
  });

  const totalHistPages = Math.max(1, Math.ceil(historyRaw.length / HIST_PAGE_SIZE));
  const history        = historyRaw.slice((histPage - 1) * HIST_PAGE_SIZE, histPage * HIST_PAGE_SIZE);

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsExtracting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      if (customPrompt)    fd.append('customPrompt',    customPrompt);
      if (routineImageUrl) fd.append('routineImageUrl', routineImageUrl);
      // apiHeadersForm() omits Content-Type so the browser sets it with the boundary
      const res = await fetch('/api/routine-import/extract', {
        method: 'POST', headers: apiHeadersForm(), body: fd,
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error);
      setExtractedData(payload.data);
      setImportId(payload.importId);
    } catch (e: any) { setError(e.message); }
    finally { setIsExtracting(false); }
  };

  const handleCommit = async (finalPayload: any) => {
    setIsCommitting(true);
    try {
      const res = await fetch('/api/routine-import/confirm', {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ importId, ...finalPayload }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      alert(`${d.count} classes imported successfully.`);
      router.push('/dashboard/classes');
    } catch (e: any) { alert(e.message); }
    finally { setIsCommitting(false); }
  };

  const handleReConfirmHistory = async (finalPayload: any) => {
    if (!viewingImportId) return;
    setIsReconfirming(true);
    try {
      const res = await fetch('/api/routine-import/confirm', {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ importId: viewingImportId, ...finalPayload }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      alert(`${d.count} classes saved.`);
      qc.invalidateQueries({ queryKey: ['routineImports', instituteId] });
      closeViewer();
    } catch (e: any) { alert(e.message); }
    finally { setIsReconfirming(false); }
  };

  const handleViewImport = async (imp: any) => {
    setLoadingViewId(imp._id);
    try {
      const res = await fetch(`/api/routine-import/${imp._id}`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      const rec = d.data;
      setViewingImport({ classDateBS: rec.rawExtractedData.classDateBS, slots: rec.rawExtractedData.slots || [] });
      setViewingFileName(imp.fileName);
      setViewingImportId(rec._id);
      setViewingStatus(rec.status);
      setViewingCommitted(rec.committedClasses || []);
    } catch (e: any) { alert(e.message); }
    finally { setLoadingViewId(null); }
  };

  const closeViewer = () => {
    setViewingImport(null); setViewingFileName('');
    setViewingImportId(null); setViewingStatus(''); setViewingCommitted([]);
  };

  const showCommittedTable  = viewingStatus === 'Processed' && viewingCommitted.length > 0;
  const showLegacyFallback  = viewingStatus === 'Processed' && viewingCommitted.length === 0;

  if (!instituteId) return <div className="p-5 text-sm text-zinc-500">Select an institute from the sidebar.</div>;

  return (
    <div className="p-5 max-w-full mx-auto space-y-4">

      {/* History viewer modal */}
      {viewingImport && (
        <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
            <div>
              <div className="text-sm font-medium text-zinc-100">Routine — {viewingFileName}</div>
              <div className="text-xs text-zinc-500">
                {viewingImport.classDateBS} · {showCommittedTable
                  ? `${viewingCommitted.length} committed classes`
                  : `${viewingImport.slots.length} raw slots`}
              </div>
            </div>
            <button onClick={closeViewer} className="text-zinc-500 hover:text-zinc-200 p-1"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-auto p-5">
            {showCommittedTable ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                      <th className="text-left p-3 pl-4 font-medium">Section</th>
                      <th className="text-left p-3 font-medium">Faculty</th>
                      <th className="text-left p-3 font-medium">Subject</th>
                      <th className="text-left p-3 font-medium">Topic</th>
                      <th className="text-left p-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {viewingCommitted.map((c: any) => (
                      <tr key={c._id}>
                        <td className="p-3 pl-4 text-zinc-300 text-xs">{c.sectionId?.name || '—'}</td>
                        <td className="p-3 text-zinc-300 text-xs">{c.facultyId?.fullName} {c.facultyId?.initials ? `(${c.facultyId.initials})` : ''}</td>
                        <td className="p-3 text-zinc-300 text-xs">{c.subject}</td>
                        <td className="p-3 text-zinc-200 text-xs">{c.topic}</td>
                        <td className="p-3 text-zinc-400 text-xs">{c.startTime} – {c.endTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                {showLegacyFallback && (
                  <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/20 border border-amber-900/30 rounded-md px-3 py-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>This import was confirmed before entry tracking was added — showing original raw extraction. Re-confirming will create new class entries.</span>
                  </div>
                )}
                <RoutineValidationGrid
                  initialSlots={viewingImport.slots}
                  defaultDateBS={viewingImport.classDateBS}
                  onConfirmImport={handleReConfirmHistory}
                />
              </>
            )}
          </div>
          {isReconfirming && (
            <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <div className="text-sm font-medium text-zinc-100">Saving classes...</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Routine Import</h1>
          <p className="text-xs text-zinc-400">Upload a routine image and extract class entries using AI</p>
        </div>
        <div className="flex gap-1">
          {(['upload', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t === 'upload' ? 'Upload' : <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> History</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Upload — before extraction */}
      {tab === 'upload' && !extractedData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            <div onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedFile ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'}`}>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/jpg"
                onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
              {selectedFile ? (
                <div className="text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs text-zinc-200">{selectedFile.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button onClick={e => { e.stopPropagation(); setSelectedFile(null); }} className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-1.5">Remove</button>
                </div>
              ) : (
                <div className="text-center">
                  <UploadCloud className="w-6 h-6 text-zinc-500 mx-auto mb-1.5" />
                  <p className="text-xs text-zinc-300">Click to upload routine image</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG supported</p>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400">Routine Image URL (reference)</label>
              <input value={routineImageUrl} onChange={e => setRoutineImageUrl(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none" placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400">Additional instructions (optional)</label>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none resize-none"
                placeholder="e.g. Ignore Evening shift..." />
            </div>
            {error && <div className="text-xs text-red-400">{error}</div>}
            <button onClick={handleProcess} disabled={!selectedFile || isExtracting}
              className="w-full bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 font-medium text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
              {isExtracting ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</> : 'Extract with AI'}
            </button>
          </div>
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-4 hidden lg:flex flex-col justify-center">
            <h3 className="text-xs font-medium text-zinc-200 mb-3">How extraction works</h3>
            <div className="space-y-2 text-[11px] text-zinc-400">
              <p>Upload a photo of your daily routine sheet. The AI reads the grid and extracts all class slots.</p>
              <p>Each cell like <span className="font-mono text-zinc-300">M-OBS</span> is split into subject code and faculty initials.</p>
              <p>Faculty are matched by <strong className="text-zinc-300">subject + initials together</strong> — so M-SD and P-SD resolve to different teachers.</p>
              <p>Review the grid, fix any unmapped entries, then confirm to save to the database.</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload — after extraction */}
      {tab === 'upload' && extractedData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-emerald-400">Extraction complete</div>
                <div className="text-xs text-zinc-400">{extractedData.slots.length} slots extracted</div>
              </div>
            </div>
            <button onClick={() => setExtractedData(null)} className="text-zinc-500 hover:text-zinc-300 p-1"><X className="w-4 h-4" /></button>
          </div>
          {routineImageUrl && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-md">
              <span>Reference:</span>
              <a href={routineImageUrl} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-zinc-100 flex items-center gap-1">
                {truncateUrl(routineImageUrl)}<ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          <RoutineValidationGrid initialSlots={extractedData.slots} defaultDateBS={extractedData.classDateBS} onConfirmImport={handleCommit} />
          {isCommitting && (
            <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <div><div className="text-sm font-medium text-zinc-100">Saving classes...</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="text-left p-3 pl-4 font-medium">File</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Classes</th>
                  <th className="text-left p-3 font-medium">Reference</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 pr-4 font-medium">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {histLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-xs text-zinc-500">Loading...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-xs text-zinc-500">No imports yet.</td></tr>
                ) : history.map((imp: any) => (
                  <tr key={imp._id} className="hover:bg-zinc-800/40">
                    <td className="p-3 pl-4 text-zinc-300 text-xs font-mono">{imp.fileName}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        imp.status === 'Processed' ? 'bg-emerald-950 text-emerald-400'
                        : imp.status === 'Failed'  ? 'bg-red-950 text-red-400'
                        : 'bg-zinc-800 text-zinc-400'
                      }`}>{imp.status.replace('_', ' ')}</span>
                    </td>
                    <td className="p-3 text-zinc-400 text-xs">{imp.processedEntriesCount}</td>
                    <td className="p-3 text-xs">
                      {imp.routineImageUrl
                        ? <a href={imp.routineImageUrl} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1">View <ExternalLink className="w-3 h-3" /></a>
                        : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="p-3 text-zinc-500 text-xs font-mono">{new Date(imp.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 pr-4 text-right">
                      <button onClick={() => handleViewImport(imp)} disabled={loadingViewId === imp._id}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40">
                        {loadingViewId === imp._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {historyRaw.length > HIST_PAGE_SIZE && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-zinc-500">{historyRaw.length} imports · page {histPage} of {totalHistPages}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setHistPage(1)} disabled={histPage === 1} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30">«</button>
                <button onClick={() => setHistPage(p => Math.max(1, p-1))} disabled={histPage === 1} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30 flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Prev</button>
                <button onClick={() => setHistPage(p => Math.min(totalHistPages, p+1))} disabled={histPage === totalHistPages} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30 flex items-center gap-1">Next <ChevronRight className="w-3 h-3" /></button>
                <button onClick={() => setHistPage(totalHistPages)} disabled={histPage === totalHistPages} className="px-2 py-1 text-xs bg-zinc-800 rounded disabled:opacity-30">»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}