import { create } from 'zustand';

import type { RideStoryTemplateId } from '@/lib/ride-story';

type RideShareDraft = {
  rideId: string | null;
  templateId: RideStoryTemplateId;
  shareMode: 'story' | 'replay';
  textTone: 'light' | 'dark';
  photoUri?: string;
  photoScale: number;
  photoOffsetX: number;
  photoOffsetY: number;
  overlayScale: number;
  overlayOffsetX: number;
  overlayOffsetY: number;
  replayDurationSec: number;
  replayCameraStyle: 'flyover';
};

type RideShareStore = {
  draft: RideShareDraft;
  initializeDraft: (rideId: string) => void;
  updateDraft: (patch: Partial<RideShareDraft>) => void;
  clearPhoto: () => void;
  resetActiveMode: (mode: 'photo' | 'template') => void;
};

const defaultDraft = (rideId: string | null = null): RideShareDraft => ({
  rideId,
  templateId: 'distance_hero',
  shareMode: 'story',
  textTone: 'light',
  photoUri: undefined,
  photoScale: 1.3,
  photoOffsetX: 0,
  photoOffsetY: -40,
  overlayScale: 1,
  overlayOffsetX: 0,
  overlayOffsetY: 0,
  replayDurationSec: 8,
  replayCameraStyle: 'flyover',
});

export const useRideShareStore = create<RideShareStore>((set) => ({
  draft: defaultDraft(),
  initializeDraft: (rideId) =>
    set((state) => (
      state.draft.rideId === rideId
        ? state
        : { draft: defaultDraft(rideId) }
    )),
  updateDraft: (patch) =>
    set((state) => ({
      draft: { ...state.draft, ...patch },
    })),
  clearPhoto: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        photoUri: undefined,
        photoScale: 1.3,
        photoOffsetX: 0,
        photoOffsetY: -40,
      },
    })),
  resetActiveMode: (mode) =>
    set((state) => ({
      draft: mode === 'photo'
        ? {
            ...state.draft,
            photoScale: 1.3,
            photoOffsetX: 0,
            photoOffsetY: -40,
          }
        : {
            ...state.draft,
            overlayScale: 1,
            overlayOffsetX: 0,
            overlayOffsetY: 0,
          },
    })),
}));
