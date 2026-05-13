import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import { IgStoryCanvas } from '@/components/ride/ig-story-canvas';
import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFuelLogs, useRideDetails } from '@/hooks/use-kurbada-data';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { useRideShareStore } from '@/store/ride-share-store';

export default function RideShareEditorScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const { session } = useAuth();
  const rideId = Array.isArray(params.rideId) ? params.rideId[0] : params.rideId;
  const rideQuery = useRideDetails(rideId, session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const latestFuelPrice = useMemo(() => {
    const logs = fuelLogs.data ?? [];
    return logs[0]?.price_per_liter ?? 65;
  }, [fuelLogs.data]);
  const draft = useRideShareStore((state) => state.draft);
  const initializeDraft = useRideShareStore((state) => state.initializeDraft);
  const updateDraft = useRideShareStore((state) => state.updateDraft);
  const resetActiveMode = useRideShareStore((state) => state.resetActiveMode);
  const [adjustMode, setAdjustMode] = useState<'photo' | 'template'>('photo');
  const draftPhotoScale = useSharedValue(draft.photoScale);
  const draftPhotoOffsetX = useSharedValue(draft.photoOffsetX);
  const draftPhotoOffsetY = useSharedValue(draft.photoOffsetY);
  const draftOverlayScale = useSharedValue(draft.overlayScale);
  const draftOverlayOffsetX = useSharedValue(draft.overlayOffsetX);
  const draftOverlayOffsetY = useSharedValue(draft.overlayOffsetY);
  const gestureStartScale = useSharedValue(1);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const adjustModeValue = useSharedValue<0 | 1>(0);
  const hydratedRideIdRef = useRef<string | null>(null);
  const [editorDraft, setEditorDraft] = useState(draft);
  const editorDraftRef = useRef(draft);

  useEffect(() => {
    if (rideId) {
      initializeDraft(rideId);
    }
  }, [initializeDraft, rideId]);

  useEffect(() => {
    adjustModeValue.value = adjustMode === 'photo' ? 0 : 1;
  }, [adjustMode, adjustModeValue]);

  const updateEditorDraft = useCallback((patch: Partial<typeof draft>) => {
    setEditorDraft((current) => {
      const next = { ...current, ...patch };
      editorDraftRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!rideId || draft.rideId !== rideId || hydratedRideIdRef.current === rideId) {
      return;
    }

    hydratedRideIdRef.current = rideId;
    editorDraftRef.current = draft;
    setEditorDraft(draft);
    draftPhotoScale.value = draft.photoScale;
    draftPhotoOffsetX.value = draft.photoOffsetX;
    draftPhotoOffsetY.value = draft.photoOffsetY;
    draftOverlayScale.value = draft.overlayScale;
    draftOverlayOffsetX.value = draft.overlayOffsetX;
    draftOverlayOffsetY.value = draft.overlayOffsetY;
  }, [
    draft.overlayOffsetX,
    draft.overlayOffsetY,
    draft.overlayScale,
    draft.photoOffsetX,
    draft.photoOffsetY,
    draft.photoScale,
    draft.rideId,
    draftOverlayOffsetX,
    draftOverlayOffsetY,
    draftOverlayScale,
    draftPhotoOffsetX,
    draftPhotoOffsetY,
    draftPhotoScale,
    draft,
    rideId,
  ]);

  const persistDraftFromEditor = () => {
    updateDraft(editorDraftRef.current);
  };

  const editorGesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Pan()
      .onBegin(() => {
        gestureStartX.value = adjustModeValue.value === 0 ? draftPhotoOffsetX.value : draftOverlayOffsetX.value;
        gestureStartY.value = adjustModeValue.value === 0 ? draftPhotoOffsetY.value : draftOverlayOffsetY.value;
      })
      .onUpdate((event) => {
        if (adjustModeValue.value === 0) {
          const nextPhotoOffsetX = gestureStartX.value + event.translationX;
          const nextPhotoOffsetY = gestureStartY.value + event.translationY;
          draftPhotoOffsetX.value = nextPhotoOffsetX;
          draftPhotoOffsetY.value = nextPhotoOffsetY;
          runOnJS(updateEditorDraft)({
            photoOffsetX: Number(nextPhotoOffsetX.toFixed(1)),
            photoOffsetY: Number(nextPhotoOffsetY.toFixed(1)),
          });
          return;
        }
        const nextOverlayOffsetX = gestureStartX.value + event.translationX;
        const nextOverlayOffsetY = gestureStartY.value + event.translationY;
        draftOverlayOffsetX.value = nextOverlayOffsetX;
        draftOverlayOffsetY.value = nextOverlayOffsetY;
        runOnJS(updateEditorDraft)({
          overlayOffsetX: Number(nextOverlayOffsetX.toFixed(1)),
          overlayOffsetY: Number(nextOverlayOffsetY.toFixed(1)),
        });
      }),
    Gesture.Pinch()
      .onBegin(() => {
        gestureStartScale.value = adjustModeValue.value === 0 ? draftPhotoScale.value : draftOverlayScale.value;
      })
      .onUpdate((event) => {
        const nextScale = Math.max(0.6, Math.min(3, gestureStartScale.value * event.scale));
        if (adjustModeValue.value === 0) {
          draftPhotoScale.value = nextScale;
          runOnJS(updateEditorDraft)({ photoScale: Number(nextScale.toFixed(3)) });
          return;
        }
        draftOverlayScale.value = nextScale;
        runOnJS(updateEditorDraft)({ overlayScale: Number(nextScale.toFixed(3)) });
      }),
  ), [
    adjustModeValue,
    draftOverlayOffsetX,
    draftOverlayOffsetY,
    draftOverlayScale,
    draftPhotoOffsetX,
    draftPhotoOffsetY,
    draftPhotoScale,
    gestureStartScale,
    gestureStartX,
    gestureStartY,
    updateEditorDraft,
  ]);

  const handleChoosePhoto = async () => {
    try {
      triggerLightHaptic();
      const pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      draftPhotoScale.value = 1.3;
      draftPhotoOffsetX.value = 0;
      draftPhotoOffsetY.value = -40;
      updateEditorDraft({
        photoUri: pickerResult.assets[0].uri,
        photoScale: 1.3,
        photoOffsetX: 0,
        photoOffsetY: -40,
      });
      triggerSuccessHaptic();
      setAdjustMode('photo');
    } catch {
      // no-op
    }
  };

  const ride = rideQuery.data;

  return (
    <AppScreen style={{ paddingHorizontal: 20, paddingTop: 12 }} showWordmark={false}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Pressable
          hitSlop={10}
          onPress={() => {
            triggerLightHaptic();
            persistDraftFromEditor();
            router.back();
          }}>
          <AppText variant="button" style={{ color: palette.textSecondary }}>
            Back
          </AppText>
        </Pressable>
        <AppText variant="bodyBold">Adjust Share Card</AppText>
        <Pressable
          hitSlop={10}
          onPress={() => {
            triggerSuccessHaptic();
            persistDraftFromEditor();
            router.back();
          }}>
          <AppText variant="button" style={{ color: palette.danger }}>
            Done
          </AppText>
        </Pressable>
      </View>

      {ride ? (
        <View style={{ flex: 1, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setAdjustMode('photo');
              }}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: adjustMode === 'photo' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: adjustMode === 'photo' ? palette.background : palette.textSecondary }}>
                Photo
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setAdjustMode('template');
              }}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: adjustMode === 'template' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: adjustMode === 'template' ? palette.background : palette.textSecondary }}>
                Template
              </AppText>
            </Pressable>
          </View>

          <GestureDetector gesture={editorGesture}>
            <View style={{ alignItems: 'center' }}>
              <IgStoryCanvas
                ride={ride}
                photoUri={editorDraft.photoUri}
                templateId={editorDraft.templateId}
                fuelPricePerLiter={latestFuelPrice}
                photoScale={editorDraft.photoScale}
                photoOffsetX={editorDraft.photoOffsetX}
                photoOffsetY={editorDraft.photoOffsetY}
                overlayScale={editorDraft.overlayScale}
                overlayOffsetX={editorDraft.overlayOffsetX}
                overlayOffsetY={editorDraft.overlayOffsetY}
                width={300}
              />
            </View>
          </GestureDetector>

          <View style={{ gap: 8 }}>
            <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 12 }}>
              {adjustMode === 'photo'
                ? 'Pinch to zoom the photo and drag to position it.'
                : 'Pinch to scale the template and drag it into place.'}
            </AppText>
            <Button title="Choose Photo" variant="secondary" onPress={() => void handleChoosePhoto()} />
            <Button
              title="Reset"
              variant="secondary"
              onPress={() => {
                triggerLightHaptic();
                resetActiveMode(adjustMode);
                if (adjustMode === 'photo') {
                  draftPhotoScale.value = 1.3;
                  draftPhotoOffsetX.value = 0;
                  draftPhotoOffsetY.value = -40;
                  updateEditorDraft({
                    photoScale: 1.3,
                    photoOffsetX: 0,
                    photoOffsetY: -40,
                  });
                  return;
                }
                draftOverlayScale.value = 1;
                draftOverlayOffsetX.value = 0;
                draftOverlayOffsetY.value = 0;
                updateEditorDraft({
                  overlayScale: 1,
                  overlayOffsetX: 0,
                  overlayOffsetY: 0,
                });
              }}
            />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center' }}>
            Loading editor…
          </AppText>
        </ScrollView>
      )}
    </AppScreen>
  );
}
