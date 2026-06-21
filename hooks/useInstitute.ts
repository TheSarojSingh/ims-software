'use client';

import { useContext } from 'react';
import { InstituteContext } from '@/providers/InstituteProvider';

export function useInstitute() {
  const ctx = useContext(InstituteContext);
  if (!ctx) throw new Error('useInstitute must be used within InstituteProvider');
  return ctx;
}