import { create } from 'zustand';

import type { RideSessionState } from '@/types/domain';

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
  startedAt?: number;
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
  crashCountdown: number | null;
  fatiguePromptShown: boolean;
  fuelPricePerLiter: number;
  fuelRateKmPerLiter: number;
  setState: (state: RideSessionState) => void;
  setBikeId: (bikeId?: string) => void;
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

export const useRideStore = create<RideStore>((set) => ({
  state: 'idle',
  bikeId: undefined,
  startedAt: undefined,
  ...initialTelemetry,
  crashCountdown: null,
  fatiguePromptShown: false,
  fuelPricePerLiter: 65,
  fuelRateKmPerLiter: 28,
  setState: (state) => set({ state }),
  setBikeId: (bikeId) => set({ bikeId }),
  setStartedAt: (startedAt) => set({ startedAt }),
  setCrashCountdown: (crashCountdown) => set({ crashCountdown }),
  setFatiguePromptShown: (fatiguePromptShown) => set({ fatiguePromptShown }),
  updateTelemetry: (patch) =>
    set((store) => {
      const nextPatch: Partial<RideStore> = {};
      let changed = false;

      (Object.entries(patch) as [keyof TelemetrySnapshot, number][]).forEach(([key, value]) => {
        if (value === undefined || store[key] === value) {
          return;
        }

        nextPatch[key] = value as never;
        changed = true;
      });

      return changed ? nextPatch : store;
    }),
  setFuelPricePerLiter: (fuelPricePerLiter) => set({ fuelPricePerLiter }),
  setFuelRateKmPerLiter: (fuelRateKmPerLiter) => set({ fuelRateKmPerLiter }),
  resetRide: () =>
    set({
      state: 'idle',
      bikeId: undefined,
      startedAt: undefined,
      ...initialTelemetry,
      crashCountdown: null,
      fatiguePromptShown: false,
      fuelPricePerLiter: 65,
      fuelRateKmPerLiter: 28,
    }),
}));
