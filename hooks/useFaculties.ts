'use client';

import { useQuery } from '@tanstack/react-query';
import { useInstitute } from './useInstitute';

export function useFaculties(search = '', includeInactive = false) {
  const { instituteId, apiHeaders } = useInstitute();

  return useQuery({
    queryKey: ['faculties', instituteId, search, includeInactive],
    enabled:  !!instituteId,
    queryFn:  async () => {
      const p = new URLSearchParams();
      if (search)          p.set('search',          search);
      if (includeInactive) p.set('includeInactive', 'true');
      const res = await fetch(`/api/faculties?${p}`, { headers: apiHeaders() });
      const d   = await res.json();
      if (!d.success) throw new Error(d.error);
      return d.data;
    },
  });
}