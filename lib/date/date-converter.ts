// @ts-ignore
import NepaliDate from 'nepali-date-converter';

export function convertADtoBS(adDate: Date): string {
  try {
    return new NepaliDate(new Date(adDate)).format('YYYY-MM-DD');
  } catch {
    return '';
  }
}

export function convertBStoAD(bsDateString: string): Date {
  const parts = bsDateString.split('-');
  if (parts.length !== 3) throw new Error('Invalid BS date format. Expected YYYY-MM-DD');
  const year  = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day   = parseInt(parts[2], 10);
  return new NepaliDate(year, month, day).toJsDate();
}