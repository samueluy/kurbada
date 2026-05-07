import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { weatherFromCode } from '@/lib/format';
import type { WeatherData } from '@/types/domain';

const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;

function isValidCoords(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent('Asia/Manila')}&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API returned ${res.status}`);
  }

  const json = await res.json();
  const current = json.current ?? {};
  const daily = json.daily ?? {};

  const weatherCode = current.weather_code ?? 0;
  const weather = weatherFromCode(weatherCode);

  return {
    temperature: Math.round(current.temperature_2m ?? 0),
    weatherCode,
    weatherLabel: weather.label,
    weatherIcon: weather.icon,
    windSpeed: Math.round((current.wind_speed_10m ?? 0) * 10) / 10,
    sunrise: daily.sunrise?.[0] ?? '',
    sunset: daily.sunset?.[0] ?? '',
    tempMax: Math.round(daily.temperature_2m_max?.[0] ?? 0),
    tempMin: Math.round(daily.temperature_2m_min?.[0] ?? 0),
    precipProb: daily.precipitation_probability_max?.[0] ?? 0,
    locationName: '',
  };
}

export function useWeather() {
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
        if (isValidCoords(lat, lng)) {
          setCoords({ lat, lng });
        } else {
          setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return useQuery({
    queryKey: ['weather', coords?.lat, coords?.lng],
    enabled: Boolean(coords),
    queryFn: async () => {
      try {
        return await fetchWeather(coords!.lat, coords!.lng);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch weather data');
      }
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
  });
}
