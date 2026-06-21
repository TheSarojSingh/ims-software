'use client';

import { useQuery } from '@tanstack/react-query';
import { useInstitute } from './useInstitute';

export function useSections(includeAll = false) {
  const { instituteId, apiHeaders } = useInstitute();

  return useQuery({
    queryKey: ['sections', instituteId, includeAll],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const res = await fetch(`/api/sections${includeAll ? '?all=true' : ''}`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });
}