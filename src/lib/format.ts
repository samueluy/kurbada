import type { RideMode } from '@/types/domain';

export function formatCurrencyPhp(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateLabel(date: string | number | Date, locale = 'en-PH') {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Magandang umaga';
  }
  if (hour < 18) {
    return 'Magandang hapon';
  }
  return 'Magandang gabi';
}

export function formatModeLabel(mode: RideMode) {
  return mode === 'weekend' ? 'Weekend' : 'Hustle';
}
