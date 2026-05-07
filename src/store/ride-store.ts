import { create } from 'zustand';

import type { LeanCalibration, RideMode, RidePoint, RideSessionState } from '@/types/domain';

export type DashboardView = 'speed' | 'distance' | 'economy';

export type TelemetrySnapshot = {
  speedKmh: number;
  distanceKm: number;
  durationSeconds: number;
  leanAngleDeg: number;
  maxLeanAngleDeg: number;
  maxSpeedKmh: number;
  altitudeMeters: number;
  estimatedFuelLiters: number;
  estimatedFuelCost: number;
  gForce: number;
  heading: number;
};

type RideStore = {
  state: RideSessionState;
  mode: RideMode;
  bikeId?: string;
  calibration?: LeanCalibration;
  calibrationCountdown: number | null;
  points: RidePoint[];
  foregroundPoints: RidePoint[];
  startedAt?: number;
  telemetry: TelemetrySnapshot;
  crashCountdown: number | null;
  dashboardView: DashboardView;
  fuelPricePerLiter: number;
  setState: (state: RideSessionState) => void;
  setMode: (mode: RideMode) => void;
  setBikeId: (bikeId?: string) => void;
  setCalibration: (calibration?: LeanCalibration) => void;
  setCalibrationCountdown: (value: number | null) => void;
  appendPoint: (point: RidePoint) => void;
  appendForegroundPoint: (point: RidePoint) => void;
  getAllPoints: () => RidePoint[];
  resetRide: () => void;
  setStartedAt: (startedAt?: number) => void;
  setCrashCountdown: (value: number | null) => void;
  updateTelemetry: (patch: Partial<TelemetrySnapshot>) => void;
  setDashboardView: (view: DashboardView) => void;
  setFuelPricePerLiter: (price: number) => void;
};

const initialTelemetry: TelemetrySnapshot = {
  speedKmh: 0,
  distanceKm: 0,
  durationSeconds: 0,
  leanAngleDeg: 0,
  maxLeanAngleDeg: 0,
  maxSpeedKmh: 0,
  altitudeMeters: 0,
  estimatedFuelLiters: 0,
  estimatedFuelCost: 0,
  gForce: 0,
  heading: 0,
};

export const useRideStore = create<RideStore>((set, get) => ({
  state: 'idle',
  mode: 'weekend',
  bikeId: undefined,
  calibration: undefined,
  calibrationCountdown: null,
  points: [],
  foregroundPoints: [],
  startedAt: undefined,
  telemetry: initialTelemetry,
  crashCountdown: null,
  dashboardView: 'speed',
  fuelPricePerLiter: 65,
  setState: (state) => set({ state }),
  setMode: (mode) => set({ mode }),
  setBikeId: (bikeId) => set({ bikeId }),
  setCalibration: (calibration) => set({ calibration }),
  setCalibrationCountdown: (calibrationCountdown) => set({ calibrationCountdown }),
  appendPoint: (point) => set((store) => ({ points: [...store.points, point] })),
  appendForegroundPoint: (point) => set((store) => ({ foregroundPoints: [...store.foregroundPoints, point] })),
  getAllPoints: () => {
    const state = get();
    const all = [...state.foregroundPoints, ...state.points].sort((a, b) => a.timestamp - b.timestamp);
    return all.filter((p, i, arr) => i === 0 || p.timestamp !== arr[i - 1].timestamp);
  },
  setStartedAt: (startedAt) => set({ startedAt }),
  setCrashCountdown: (crashCountdown) => set({ crashCountdown }),
  updateTelemetry: (patch) =>
    set((store) => ({
      telemetry: { ...store.telemetry, ...patch },
    })),
  setDashboardView: (dashboardView) => set({ dashboardView }),
  setFuelPricePerLiter: (fuelPricePerLiter) => set({ fuelPricePerLiter }),
  resetRide: () =>
    set({
      state: 'idle',
      mode: 'weekend',
      bikeId: undefined,
      calibration: undefined,
      calibrationCountdown: null,
      points: [],
      foregroundPoints: [],
      startedAt: undefined,
      telemetry: initialTelemetry,
      crashCountdown: null,
      dashboardView: 'speed',
      fuelPricePerLiter: 65,
    }),
}));
