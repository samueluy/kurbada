import type { Bike } from '@/types/domain';

type CcRange = { max: number; economy: Record<Bike['category'], number> };

const economyTable: CcRange[] = [
  { max: 125, economy: { sport: 30, naked: 38, adventure: 36, scooter: 42 } },
  { max: 150, economy: { sport: 28, naked: 35, adventure: 33, scooter: 38 } },
  { max: 200, economy: { sport: 25, naked: 32, adventure: 30, scooter: 35 } },
  { max: 250, economy: { sport: 22, naked: 30, adventure: 28, scooter: 33 } },
  { max: 400, economy: { sport: 20, naked: 26, adventure: 24, scooter: 30 } },
  { max: 650, economy: { sport: 17, naked: 22, adventure: 20, scooter: 28 } },
  { max: 1000, economy: { sport: 15, naked: 20, adventure: 18, scooter: 26 } },
  { max: Infinity, economy: { sport: 14, naked: 18, adventure: 16, scooter: 24 } },
];

export function estimateFuelEconomy(engineCc: number, category: Bike['category'] = 'naked'): number {
  for (const range of economyTable) {
    if (engineCc <= range.max) {
      return range.economy[category] ?? range.economy.naked;
    }
  }
  return 28;
}

export function estimateFuelRate(engineCc?: number, category?: Bike['category'], mode?: 'weekend' | 'hustle'): number {
  const baseRate = estimateFuelEconomy(engineCc ?? 400, category ?? 'naked');
  return mode === 'weekend' ? baseRate * 0.78 : baseRate;
}
