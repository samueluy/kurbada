import { useQuery } from '@tanstack/react-query';

import { useCachedLocation } from '@/hooks/use-cached-location';

const CLEAR_PRECIP_THRESHOLD = 30; // percent
const WEATHER_CODE_BAD_MIN = 51; // drizzle and up

export type HourlyForecast = {
  time: string; // ISO
  precipProb: number; // 0-100
  weatherCode: number;
  temperature: number;
  isClear: boolean;
};

export type RideWindow = {
  startIso: string;
  endIso: string;
  hours: number;
  startLabel: string; // "Tue 5 AM"
  endLabel: string; // "7 AM"
};

async function fetchHourly(lat: number, lng: number): Promise<HourlyForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation_probability,weather_code,temperature_2m&timezone=${encodeURIComponent('Asia/Manila')}&forecast_days=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
  const json = await res.json();
  const times: string[] = json.hourly?.time ?? [];
  const probs: number[] = json.hourly?.precipitation_probability ?? [];
  const codes: number[] = json.hourly?.weather_code ?? [];
  const temps: number[] = json.hourly?.temperature_2m ?? [];

  const now = Date.now();
  return times
    .map((t, i) => {
      const iso = new Date(t).toISOString();
      return {
        time: iso,
        precipProb: probs[i] ?? 0,
        weatherCode: codes[i] ?? 0,
        temperature: Math.round(temps[i] ?? 0),
        isClear: (probs[i] ?? 0) < CLEAR_PRECIP_THRESHOLD && (codes[i] ?? 0) < WEATHER_CODE_BAD_MIN,
      };
    })
    .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000);
}

function formatHourLabel(d: Date, includeDay = false) {
  const day = d.toLocaleDateString('en-PH', { weekday: 'short' });
  const hour = d.getHours();
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return includeDay ? `${day} ${h12} ${ampm}` : `${h12} ${ampm}`;
}

export function findNextRideWindow(forecast: HourlyForecast[]): RideWindow | null {
  let windowStart: HourlyForecast | null = null;
  let runLength = 0;

  for (let i = 0; i < forecast.length; i++) {
    const hour = forecast[i];
    if (hour.isClear) {
      if (!windowStart) windowStart = hour;
      runLength += 1;
      if (runLength >= 2) {
        const start = new Date(windowStart.time);
        const endHour = forecast[i];
        const end = new Date(new Date(endHour.time).getTime() + 60 * 60 * 1000);
        return {
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          hours: runLength,
          startLabel: formatHourLabel(start, true),
          endLabel: formatHourLabel(end, false),
        };
      }
    } else {
      windowStart = null;
      runLength = 0;
    }
  }

  return null;
}

export function useWeatherWindow() {
  const location = useCachedLocation();

  return useQuery({
    queryKey: ['weather-window', location.data?.lat, location.data?.lng],
    enabled: Boolean(location.data),
    queryFn: async () => {
      const forecast = await fetchHourly(location.data!.lat, location.data!.lng);
      return {
        forecast,
        window: findNextRideWindow(forecast),
      };
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 2,
  });
}
