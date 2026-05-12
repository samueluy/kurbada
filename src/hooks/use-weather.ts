import { useQuery } from '@tanstack/react-query';

import { weatherFromCode } from '@/lib/format';
import { useCachedLocation } from '@/hooks/use-cached-location';
import type { WeatherData } from '@/types/domain';

type WeatherQueryOptions = {
  enabled?: boolean;
};

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

export function useWeather(options?: WeatherQueryOptions) {
  const enabled = options?.enabled ?? true;
  const location = useCachedLocation({ enabled });

  return useQuery({
    queryKey: ['weather', location.data?.lat, location.data?.lng],
    enabled: enabled && Boolean(location.data),
    queryFn: async () => fetchWeather(location.data!.lat, location.data!.lng),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
  });
}
