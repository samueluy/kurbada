import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;
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

function isValidCoords(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

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

/**
 * Finds the earliest upcoming 2+ hour window where the weather is "clear"
 * (low precipitation probability and benign weather code).
 */
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
        // End time = the end of the last clear hour slot
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      return;
    }

    let cancelled = false;
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      .then((pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords(isValidCoords(lat, lng) ? { lat, lng } : { lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      })
      .catch(() => {
        if (!cancelled) setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const query = useQuery({
    queryKey: ['weather-window', coords?.lat, coords?.lng],
    enabled: Boolean(coords),
    queryFn: async () => {
      const forecast = await fetchHourly(coords!.lat, coords!.lng);
      return {
        forecast,
        window: findNextRideWindow(forecast),
      };
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 2,
  });

  return query;
}
