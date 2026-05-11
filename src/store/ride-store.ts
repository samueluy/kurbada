import { create } from 'zustand';

import type { RidePoint, RideSessionState } from '@/types/domain';

export type DashboardView = 'speed' | 'distance' | 'economy';

export type TelemetrySnapshot = {
  speedKmh: number;
  distanceKm: number;
  durationSeconds: number;
  maxSpeedKmh: number;
  altitudeMeters: number;
  elevationGainM: number;
  estimatedFuelLiters: number;
  estimatedFuelCost: number;
  gForce: number;
  heading: number;
};

type RideStore = {
  state: RideSessionState;
  bikeId?: string;
  points: RidePoint[];
  foregroundPoints: RidePoint[];
  startedAt?: number;
  telemetry: TelemetrySnapshot;
  crashCountdown: number | null;
  fatiguePromptShown: boolean;
  fuelPricePerLiter: number;
  fuelRateKmPerLiter: number;
  setState: (state: RideSessionState) => void;
  setBikeId: (bikeId?: string) => void;
  appendPoint: (point: RidePoint) => void;
  appendForegroundPoint: (point: RidePoint) => void;
  getAllPoints: () => RidePoint[];
  resetRide: () => void;
  setStartedAt: (startedAt?: number) => void;
  setCrashCountdown: (value: number | null) => void;
  setFatiguePromptShown: (value: boolean) => void;
  updateTelemetry: (patch: Partial<TelemetrySnapshot>) => void;
  setFuelPricePerLiter: (price: number) => void;
  setFuelRateKmPerLiter: (rate: number) => void;
};

const initialTelemetry: TelemetrySnapshot = {
  speedKmh: 0,
  distanceKm: 0,
  durationSeconds: 0,
  maxSpeedKmh: 0,
  altitudeMeters: 0,
  elevationGainM: 0,
  estimatedFuelLiters: 0,
  estimatedFuelCost: 0,
  gForce: 0,
  heading: 0,
};

export const useRideStore = create<RideStore>((set, get) => ({
  state: 'idle',
  bikeId: undefined,
  points: [],
  foregroundPoints: [],
  startedAt: undefined,
  telemetry: initialTelemetry,
  crashCountdown: null,
  fatiguePromptShown: false,
  fuelPricePerLiter: 65,
  fuelRateKmPerLiter: 28,
  setState: (state) => set({ state }),
  setBikeId: (bikeId) => set({ bikeId }),
  appendPoint: (point) => set((store) => ({ points: [...store.points, point] })),
  appendForegroundPoint: (point) => set((store) => ({ foregroundPoints: [...store.foregroundPoints, point] })),
  getAllPoints: () => {
    const state = get();
    const all = [...state.foregroundPoints, ...state.points].sort((a, b) => a.timestamp - b.timestamp);
    return all.filter((p, i, arr) => i === 0 || p.timestamp !== arr[i - 1].timestamp);
  },
  setStartedAt: (startedAt) => set({ startedAt }),
  setCrashCountdown: (crashCountdown) => set({ crashCountdown }),
  setFatiguePromptShown: (fatiguePromptShown) => set({ fatiguePromptShown }),
  updateTelemetry: (patch) =>
    set((store) => ({
      telemetry: { ...store.telemetry, ...patch },
    })),
  setFuelPricePerLiter: (fuelPricePerLiter) => set({ fuelPricePerLiter }),
  setFuelRateKmPerLiter: (fuelRateKmPerLiter) => set({ fuelRateKmPerLiter }),
  resetRide: () =>
    set({
      state: 'idle',
      bikeId: undefined,
      points: [],
      foregroundPoints: [],
      startedAt: undefined,
      telemetry: initialTelemetry,
      crashCountdown: null,
      fatiguePromptShown: false,
      fuelPricePerLiter: 65,
      fuelRateKmPerLiter: 28,
    }),
}));
