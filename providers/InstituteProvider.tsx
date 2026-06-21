'use client';

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface InstituteInfo {
  _id:       string;
  name:      string;
  shortName: string;
  address?:  string;
  phone?:    string;
  isActive:  boolean;
}

interface InstituteContextValue {
  institutes:          InstituteInfo[];
  activeInstitute:     InstituteInfo | null;
  setActiveInstitute:  (inst: InstituteInfo) => void;
  instituteId:         string | null;
  isLoading:           boolean;
  /** For JSON requests: includes Content-Type + x-institute-id */
  apiHeaders:     () => Record<string, string>;
  /** For FormData/multipart: only x-institute-id — browser sets Content-Type */
  apiHeadersForm: () => Record<string, string>;
}

export const InstituteContext = createContext<InstituteContextValue | null>(null);

const STORAGE_KEY = 'cms_active_institute_id';

export function InstituteProvider({ children }: { children: ReactNode }) {
  const [institutes,  setInstitutes]  = useState<InstituteInfo[]>([]);
  const [active,      setActiveState] = useState<InstituteInfo | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/institutes');
        const data = await res.json();
        if (!data.success || !data.data.length) return;

        const list: InstituteInfo[] = data.data.filter((i: InstituteInfo) => i.isActive);
        setInstitutes(list);

        const savedId = localStorage.getItem(STORAGE_KEY);
        const match   = list.find(i => i._id === savedId) ?? list[0];
        setActiveState(match);
        localStorage.setItem(STORAGE_KEY, match._id);
      } catch { /* network not ready */ }
      finally  { setIsLoading(false); }
    })();
  }, []);

  const setActiveInstitute = useCallback((inst: InstituteInfo) => {
    setActiveState(inst);
    localStorage.setItem(STORAGE_KEY, inst._id);
  }, []);

  const instituteId = active?._id ?? null;

  const apiHeaders = useCallback((): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(instituteId ? { 'x-institute-id': instituteId } : {}),
  }), [instituteId]);

  const apiHeadersForm = useCallback((): Record<string, string> => ({
    ...(instituteId ? { 'x-institute-id': instituteId } : {}),
  }), [instituteId]);

  return (
    <InstituteContext.Provider value={{
      institutes,
      activeInstitute: active,
      setActiveInstitute,
      instituteId,
      isLoading,
      apiHeaders,
      apiHeadersForm,
    }}>
      {children}
    </InstituteContext.Provider>
  );
}