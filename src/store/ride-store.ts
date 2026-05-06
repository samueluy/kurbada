import { create } from 'zustand';

import type { LeanCalibration, RideMode, RidePoint, RideSessionState } from '@/types/domain';

type TelemetrySnapshot = {
  speedKmh: number;
  distanceKm: number;
  durationSeconds: number;
  leanAngleDeg: number;
  maxLeanAngleDeg: number;
  maxSpeedKmh: number;
  altitudeMeters: number;
  estimatedFuelLiters: number;
  gForce: number;
};

type RideStore = {
  state: RideSessionState;
  mode: RideMode;
  bikeId?: string;
  calibration?: LeanCalibration;
  points: RidePoint[];
  startedAt?: number;
  telemetry: TelemetrySnapshot;
  crashCountdown: number | null;
  setState: (state: RideSessionState) => void;
  setMode: (mode: RideMode) => void;
  setBikeId: (bikeId?: string) => void;
  setCalibration: (calibration?: LeanCalibration) => void;
  appendPoint: (point: RidePoint) => void;
  resetRide: () => void;
  setStartedAt: (startedAt?: number) => void;
  setCrashCountdown: (value: number | null) => void;
  updateTelemetry: (patch: Partial<TelemetrySnapshot>) => void;
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
  gForce: 0,
};

export const useRideStore = create<RideStore>((set) => ({
  state: 'idle',
  mode: 'weekend',
  bikeId: undefined,
  calibration: undefined,
  points: [],
  startedAt: undefined,
  telemetry: initialTelemetry,
  crashCountdown: null,
  setState: (state) => set({ state }),
  setMode: (mode) => set({ mode }),
  setBikeId: (bikeId) => set({ bikeId }),
  setCalibration: (calibration) => set({ calibration }),
  appendPoint: (point) => set((store) => ({ points: [...store.points, point] })),
  setStartedAt: (startedAt) => set({ startedAt }),
  setCrashCountdown: (crashCountdown) => set({ crashCountdown }),
  updateTelemetry: (patch) =>
    set((store) => ({
      telemetry: { ...store.telemetry, ...patch },
    })),
  resetRide: () =>
    set({
      state: 'idle',
      mode: 'weekend',
      bikeId: undefined,
      calibration: undefined,
      points: [],
      startedAt: undefined,
      telemetry: initialTelemetry,
      crashCountdown: null,
    }),
}));
