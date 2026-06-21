import { convertADtoBS } from './date-converter';

export function getTodayBS(): string {
  return convertADtoBS(new Date());
}

export function normalizeBSDate(d: string): string {
  const parts = d.replace(/\//g, '-').trim().split('-').map(p => p.trim());
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
}