import type { RideMode } from '@/types/domain';

export function formatCurrencyPhp(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  return mode === 'weekend' ? 'Weekend' : 'Daily';
}

export function weatherFromCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear sky', icon: 'sunny-outline' };
  if (code === 1) return { label: 'Mainly clear', icon: 'partly-sunny-outline' };
  if (code === 2) return { label: 'Partly cloudy', icon: 'cloudy-outline' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud-outline' };
  if (code >= 45 && code <= 48) return { label: 'Fog', icon: 'cloudy-outline' };
  if (code >= 51 && code <= 55) return { label: 'Drizzle', icon: 'rainy-outline' };
  if (code >= 61 && code <= 65) return { label: 'Rain', icon: 'rainy-outline' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'snow-outline' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'rainy-outline' };
  if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: 'snow-outline' };
  if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: 'thunderstorm-outline' };
  return { label: 'Partly cloudy', icon: 'cloudy-outline' };
}

export function formatSubscriptionStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'trialing':
      return 'Trial active';
    case 'active':
      return 'Premium active';
    case 'canceled':
      return 'Ends at renewal';
    case 'grace_period':
      return 'Grace period';
    default:
      return 'Inactive';
  }
}
