'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFaculties } from '@/hooks/useFaculties';
import { useSections } from '@/hooks/useSections';
import { X, Plus, Pencil } from 'lucide-react';

interface ExtractedSlot {
  sectionName:     string;
  subjectCode:     string;
  facultyInitials: string;
  topic:           string;
  startTime:       string;
  endTime:         string;
  shift?:          string;
}

interface CellData {
  subjectCode:     string;
  facultyInitials: string;
  topic:           string;
  facultyId?:      string;
}

interface Props {
  initialSlots:    ExtractedSlot[];
  defaultDateBS:   string;
  onConfirmImport: (payload: any) => void;
}

function parseTimeToMinutes(t: string): number {
  const c = t.trim().toUpperCase().replace(/\s/g, '');
  const isPM = c.includes('PM'); const isAM = c.includes('AM');
  const n = c.replace('AM','').replace('PM','');
  const [hS, mS] = n.split(':'); let h = parseInt(hS, 10); const m = parseInt(mS || '0', 10);
  if (isPM && h !== 12) h += 12; if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

function detectShift(startTime: string): string {
  const mins = parseTimeToMinutes(startTime);
  if (mins < 12 * 60) return 'Morning';
  if (mins < 16 * 60) return 'Day';
  return 'Evening';
}

function normalizeTime(t: string): string {
  return t.trim().toUpperCase().replace(/\s+/g, '');
}

export default function RoutineValidationGrid({ initialSlots, defaultDateBS, onConfirmImport }: Props) {
  const { data: dbFaculties = [] } = useFaculties();
  const { data: dbSections  = [] } = useSections();

  const [dateBS,          setDateBS]          = useState(defaultDateBS);
  const [validationError, setValidationError] = useState('');
  const [grid,            setGrid]            = useState<Record<string, Record<string, CellData>>>({});
  const [mappedSections,  setMappedSections]  = useState<Record<string, string>>({});
  const [shifts,          setShifts]          = useState<Array<{ name: string; times: string[]; sections: string[] }>>([]);

  // ── NEW: which section names are currently showing the remap dropdown ──────
  const [remappingSections, setRemappingSections] = useState<Set<string>>(new Set());

  const toggleRemap = (sec: string) => {
    setRemappingSections(prev => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec); else next.add(sec);
      return next;
    });
  };

  const closeRemap = (sec: string) => {
    setRemappingSections(prev => { const next = new Set(prev); next.delete(sec); return next; });
  };

  // ── Build grid from initialSlots ─────────────────────────────────────────
  useEffect(() => {
    const gridMap: Record<string, Record<string, CellData>> = {};
    const shiftData: Record<string, { timesMap: Map<string, number>; sections: Set<string> }> = {
      Morning: { timesMap: new Map(), sections: new Set() },
      Day:     { timesMap: new Map(), sections: new Set() },
      Evening: { timesMap: new Map(), sections: new Set() },
    };

    initialSlots.forEach(slot => {
      const tk  = `${normalizeTime(slot.startTime)}||${normalizeTime(slot.endTime)}`;
      const raw = slot.shift || detectShift(slot.startTime);
      const key = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      const s   = (['Morning', 'Day', 'Evening'] as const).includes(key as any)
        ? (key as 'Morning' | 'Day' | 'Evening') : 'Morning';

      if (!shiftData[s].timesMap.has(tk))
        shiftData[s].timesMap.set(tk, parseTimeToMinutes(slot.startTime));
      shiftData[s].sections.add(slot.sectionName);

      if (!gridMap[slot.sectionName]) gridMap[slot.sectionName] = {};
      gridMap[slot.sectionName][tk] = {
        subjectCode:     slot.subjectCode     || '',
        facultyInitials: slot.facultyInitials || '',
        topic:           slot.topic           || '',
      };
    });

    setGrid(gridMap);

    const builtShifts = (['Morning', 'Day', 'Evening'] as const)
      .map(name => ({
        name,
        times:    [...shiftData[name].timesMap.entries()].sort((a,b) => a[1]-b[1]).map(([tk]) => tk),
        sections: [...shiftData[name].sections],
      }))
      .filter(s => s.times.length > 0);

    setShifts(builtShifts);
    // Reset remap state when slots change
    setRemappingSections(new Set());
  }, [initialSlots]);

  // ── Auto-map sections by name ─────────────────────────────────────────────
  useEffect(() => {
    if (!dbSections.length) return;
    const allSections = shifts.flatMap(s => s.sections);
    const sMap: Record<string, string> = {};
    allSections.forEach(sec => {
      const match = dbSections.find((s: any) => s.name.toUpperCase() === sec.toUpperCase());
      if (match) sMap[sec] = match._id;
    });
    setMappedSections(prev => ({ ...sMap, ...prev }));
  }, [dbSections, shifts]);

  // ── Resolve faculty by subject+initials ───────────────────────────────────
  const resolvedGrid = useMemo(() => {
    if (!dbFaculties.length) return grid;
    const resolved: Record<string, Record<string, CellData>> = {};
    Object.entries(grid).forEach(([sec, times]) => {
      resolved[sec] = {};
      Object.entries(times).forEach(([tk, cell]) => {
        let facultyId = cell.facultyId;
        if (!facultyId && cell.facultyInitials) {
          const match =
            dbFaculties.find((f: any) =>
              f.initials.toUpperCase() === cell.facultyInitials.toUpperCase() &&
              f.subject.toUpperCase()  === cell.subjectCode.toUpperCase()
            ) ??
            dbFaculties.find((f: any) =>
              f.initials.toUpperCase() === cell.facultyInitials.toUpperCase()
            );
          if (match) facultyId = match._id;
        }
        resolved[sec][tk] = { ...cell, facultyId };
      });
    });
    return resolved;
  }, [grid, dbFaculties]);

  // ── Live stats ────────────────────────────────────────────────────────────
  const liveStats = useMemo(() => {
    const facultyMap: Record<string, {
      label: string; initials: string; subject: string; resolved: boolean;
      totalClasses: number; sections: Record<string, number>;
    }> = {};

    Object.entries(resolvedGrid).forEach(([sec, times]) => {
      Object.entries(times).forEach(([, cell]) => {
        if (!cell.subjectCode && !cell.facultyInitials) return;
        const facKey = cell.facultyId ?? `${cell.subjectCode}-${cell.facultyInitials}`;
        const fac    = dbFaculties.find((f: any) => f._id === cell.facultyId);
        const label  = fac
          ? `${fac.subject}-${fac.initials} · ${fac.fullName}`
          : `${cell.subjectCode}-${cell.facultyInitials}`;
        if (!facultyMap[facKey]) {
          facultyMap[facKey] = {
            label, initials: fac?.initials ?? cell.facultyInitials,
            subject: fac?.subject ?? cell.subjectCode,
            resolved: !!cell.facultyId, totalClasses: 0, sections: {},
          };
        }
        facultyMap[facKey].totalClasses++;
        facultyMap[facKey].sections[sec] = (facultyMap[facKey].sections[sec] || 0) + 1;
      });
    });

    const cells = Object.values(resolvedGrid).flatMap(t => Object.values(t)).filter(c => c.subjectCode || c.facultyInitials);
    return {
      byFaculty:     Object.values(facultyMap).sort((a, b) => b.totalClasses - a.totalClasses),
      totalResolved: cells.filter(c => c.facultyId).length,
      totalCells:    cells.length,
    };
  }, [resolvedGrid, dbFaculties]);

  // ── Cell mutators ─────────────────────────────────────────────────────────
  const updateCell = (sec: string, tk: string, field: keyof CellData, value: string) => {
    setGrid(prev => ({
      ...prev,
      [sec]: {
        ...(prev[sec] || {}),
        [tk]: {
          ...(prev[sec]?.[tk] || { subjectCode: '', facultyInitials: '', topic: '' }),
          [field]: value,
          ...(field === 'facultyInitials' || field === 'subjectCode' ? { facultyId: undefined } : {}),
        },
      },
    }));
  };

  const mapCellFaculty = (sec: string, tk: string, facultyId: string) => {
    const fac = dbFaculties.find((f: any) => f._id === facultyId);
    setGrid(prev => ({
      ...prev,
      [sec]: {
        ...(prev[sec] || {}),
        [tk]: {
          ...(prev[sec]?.[tk] || { subjectCode: '', facultyInitials: '', topic: '' }),
          facultyId,
          subjectCode:     fac?.subject  || prev[sec]?.[tk]?.subjectCode    || '',
          facultyInitials: fac?.initials || prev[sec]?.[tk]?.facultyInitials || '',
        },
      },
    }));
  };

  const clearCell = (sec: string, tk: string) => {
    setGrid(prev => {
      const updated = { ...prev[sec] }; delete updated[tk];
      return { ...prev, [sec]: updated };
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const payloadSlots: any[] = [];
    const errors: string[]    = [];

    shifts.forEach(shift => {
      shift.sections.forEach(sec => {
        const sectionId = mappedSections[sec];
        const cells     = resolvedGrid[sec] || {};
        const hasData   = shift.times.some(tk => cells[tk]?.facultyInitials);
        if (!sectionId && hasData) { errors.push(`Section not mapped: ${sec}`); return; }
        shift.times.forEach(tk => {
          const cell = cells[tk];
          if (!cell || (!cell.facultyInitials && !cell.subjectCode)) return;
          if (!cell.facultyId) {
            errors.push(`Faculty not resolved: ${cell.subjectCode}-${cell.facultyInitials} in ${sec}`);
            return;
          }
          const [startTime, endTime] = tk.split('||');
          payloadSlots.push({ sectionId, facultyId: cell.facultyId, subject: cell.subjectCode, topic: cell.topic, startTime, endTime });
        });
      });
    });

    if (errors.length) {
      setValidationError(errors.slice(0, 3).join(' · ') + (errors.length > 3 ? ` (+${errors.length - 3} more)` : ''));
      return;
    }
    setValidationError('');
    onConfirmImport({ classDateBS: dateBS, slots: payloadSlots });
  };

  const formatTimeLabel = (tk: string) => {
    const [s, e] = tk.split('||');
    return { start: s, end: e };
  };

  if (!shifts.length) return <div className="text-xs text-zinc-500 p-4">No data extracted.</div>;

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Amber = unresolved. Click <Pencil className="inline w-3 h-3" /> on a mapped section to remap it.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Date (B.S.)</span>
          <input value={dateBS} onChange={e => setDateBS(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none font-mono w-28" />
        </div>
      </div>

      {/* Live stats panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Live Faculty Summary</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-zinc-300">
              <span className="font-bold text-emerald-400">{liveStats.totalResolved}</span>
              <span className="text-zinc-600">/{liveStats.totalCells}</span> resolved
            </span>
            {(liveStats.totalCells - liveStats.totalResolved) > 0 && (
              <span className="text-amber-400 font-medium">{liveStats.totalCells - liveStats.totalResolved} unresolved</span>
            )}
          </div>
        </div>
        {liveStats.byFaculty.length === 0 ? (
          <p className="text-[9px] text-zinc-600">No data yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {liveStats.byFaculty.map((f, i) => (
              <div key={i} className={`rounded-md border px-2.5 py-2 space-y-1 ${
                f.resolved ? 'border-zinc-700 bg-zinc-800/40' : 'border-amber-800/50 bg-amber-950/20'
              }`}>
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[10px] font-semibold truncate ${f.resolved ? 'text-zinc-200' : 'text-amber-300'}`}>
                    {f.subject}-{f.initials}
                  </span>
                  <span className={`text-[10px] font-bold tabular-nums shrink-0 ${f.resolved ? 'text-zinc-100' : 'text-amber-200'}`}>
                    {f.totalClasses} cls
                  </span>
                </div>
                {f.resolved && (
                  <div className="text-[8px] text-zinc-500 truncate">{f.label.split(' · ')[1]}</div>
                )}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {Object.entries(f.sections).sort((a, b) => a[0].localeCompare(b[0])).map(([sec, cnt]) => (
                    <span key={sec} className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] ${
                      f.resolved ? 'bg-zinc-700 text-zinc-300' : 'bg-amber-900/40 text-amber-400'
                    }`}>
                      <span className="font-medium">{sec}</span>
                      {cnt > 1 && <span className="opacity-60">×{cnt}</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shift tables */}
      <div className="space-y-4">
        {shifts.map(shift => (
          <div key={shift.name} className="rounded-lg border border-zinc-700 overflow-hidden">
            <div className="bg-zinc-800 px-3 py-1.5 text-center text-[11px] font-semibold text-zinc-300 tracking-wide uppercase border-b border-zinc-700">
              {shift.name} Shift
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse text-[10px]" style={{ minWidth: `${100 + shift.times.length * 110}px` }}>
                <thead>
                  <tr className="bg-zinc-900/80">
                    <th className="px-2 py-1.5 text-left text-zinc-500 font-medium border-r border-b border-zinc-700 w-24 text-[9px]">
                      Section
                    </th>
                    {shift.times.map(tk => {
                      const { start, end } = formatTimeLabel(tk);
                      return (
                        <th key={tk} className="px-1 py-1.5 text-center border-r border-b border-zinc-700 font-medium leading-tight text-zinc-300" style={{ minWidth: 110 }}>
                          <div className="text-[9px]">{start}</div>
                          <div className="text-zinc-600 font-normal text-[8px]">→ {end}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {shift.sections.map(sec => {
                    const sectionId     = mappedSections[sec];
                    const mappedSection = dbSections.find((s: any) => s._id === sectionId);
                    const isRemapping   = remappingSections.has(sec);

                    return (
                      <tr key={sec} className="border-b border-zinc-800/60">
                        {/* ── Section cell with remap support ───────────── */}
                        <td className={`px-2 py-1 border-r border-zinc-700 align-top min-w-24 ${
                          !sectionId ? 'bg-amber-950/20' : 'bg-zinc-900/40'
                        }`}>
                          <div className="space-y-1">
                            {/* Section name + remap toggle */}
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-semibold ${sectionId ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {sec}
                              </span>
                              {sectionId && (
                                <button
                                  onClick={() => toggleRemap(sec)}
                                  title="Remap this section"
                                  className={`rounded p-0.5 transition-colors ${
                                    isRemapping
                                      ? 'text-amber-400 bg-amber-900/30'
                                      : 'text-zinc-700 hover:text-zinc-400 hover:bg-zinc-700'
                                  }`}
                                >
                                  <Pencil className="w-2 h-2" />
                                </button>
                              )}
                            </div>

                            {/* Mapped name (when mapped and not remapping) */}
                            {sectionId && !isRemapping && mappedSection && (
                              <div className="text-[8px] text-emerald-600 truncate leading-tight">
                                → {mappedSection.name}
                              </div>
                            )}

                            {/* Dropdown: show when unmapped OR remapping */}
                            {(!sectionId || isRemapping) && (
                              <select
                                value={sectionId || ''}
                                onChange={e => {
                                  setMappedSections(p => ({ ...p, [sec]: e.target.value }));
                                  closeRemap(sec);
                                }}
                                className={`w-full bg-zinc-800 border rounded px-1 py-0.5 text-[8px] focus:outline-none ${
                                  isRemapping
                                    ? 'border-zinc-600 text-zinc-300'
                                    : 'border-amber-700 text-amber-300'
                                }`}
                              >
                                <option value="" disabled>
                                  {isRemapping ? 'Remap →' : 'Map →'}
                                </option>
                                {dbSections.map((s: any) => (
                                  <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>

                        {/* ── Class cells ─────────────────────────────────── */}
                        {shift.times.map(tk => {
                          const cell     = resolvedGrid[sec]?.[tk];
                          const resolved = !!cell?.facultyId;

                          if (!cell) {
                            return (
                              <td key={tk} className="border-r border-zinc-700/50 p-0.5 align-top">
                                <button
                                  onClick={() => setGrid(prev => ({
                                    ...prev,
                                    [sec]: { ...(prev[sec] || {}), [tk]: { subjectCode: '', facultyInitials: '', topic: '' } },
                                  }))}
                                  className="w-full h-10 flex items-center justify-center text-zinc-800 hover:text-zinc-500 hover:bg-zinc-800/50 rounded transition-colors"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </td>
                            );
                          }

                          return (
                            <td key={tk} className={`border-r border-zinc-700/50 p-1 align-top ${!resolved ? 'bg-amber-950/20' : ''}`}>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-0.5">
                                  <input
                                    value={cell.subjectCode}
                                    onChange={e => updateCell(sec, tk, 'subjectCode', e.target.value.toUpperCase())}
                                    className="w-5 bg-zinc-800 border border-zinc-700 rounded px-0.5 py-0.5 text-[9px] text-center uppercase text-zinc-200 focus:outline-none"
                                    title="Subject"
                                  />
                                  <span className="text-zinc-600 text-[9px]">-</span>
                                  <input
                                    value={cell.facultyInitials}
                                    onChange={e => updateCell(sec, tk, 'facultyInitials', e.target.value.toUpperCase())}
                                    className={`flex-1 bg-zinc-800 border rounded px-0.5 py-0.5 text-[9px] text-center uppercase focus:outline-none ${
                                      !resolved ? 'border-amber-600 text-amber-300' : 'border-zinc-700 text-zinc-200'
                                    }`}
                                    title="Faculty initials"
                                  />
                                  <button onClick={() => clearCell(sec, tk)} className="text-zinc-700 hover:text-red-400 transition-colors ml-0.5">
                                    <X className="w-2 h-2" />
                                  </button>
                                </div>
                                <input
                                  value={cell.topic}
                                  onChange={e => updateCell(sec, tk, 'topic', e.target.value)}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[8px] text-zinc-400 focus:outline-none uppercase"
                                  placeholder="Topic"
                                />
                                {!resolved && cell.facultyInitials && (
                                  <select
                                    onChange={e => mapCellFaculty(sec, tk, e.target.value)}
                                    defaultValue=""
                                    className="w-full bg-zinc-800 border border-amber-700 text-amber-300 rounded px-1 py-0.5 text-[8px] focus:outline-none"
                                  >
                                    <option value="" disabled>Map →</option>
                                    {dbFaculties.map((f: any) => (
                                      <option key={f._id} value={f._id}>
                                        {f.subject}-{f.initials} ({f.fullName})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-amber-950 inline-block border border-amber-800" /> Unresolved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-zinc-900 inline-block border border-zinc-700" /> Matched
            </span>
          </div>
          {validationError && (
            <p className="text-[10px] text-red-400 max-w-md">{validationError}</p>
          )}
        </div>
        <button
          onClick={handleSubmit}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium px-5 py-2 rounded-md transition-colors"
        >
          Confirm & Import
        </button>
      </div>
    </div>
  );
}