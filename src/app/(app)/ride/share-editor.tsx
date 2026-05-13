import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

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

  useEffect(() => {
    if (rideId) {
      initializeDraft(rideId);
    }
  }, [initializeDraft, rideId]);

  useEffect(() => {
    adjustModeValue.value = adjustMode === 'photo' ? 0 : 1;
  }, [adjustMode, adjustModeValue]);

  useEffect(() => {
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
    draftOverlayOffsetX,
    draftOverlayOffsetY,
    draftOverlayScale,
    draftPhotoOffsetX,
    draftPhotoOffsetY,
    draftPhotoScale,
  ]);

  useAnimatedReaction(
    () => ({
      photoScale: draftPhotoScale.value,
      photoOffsetX: draftPhotoOffsetX.value,
      photoOffsetY: draftPhotoOffsetY.value,
      overlayScale: draftOverlayScale.value,
      overlayOffsetX: draftOverlayOffsetX.value,
      overlayOffsetY: draftOverlayOffsetY.value,
    }),
    (next, previous) => {
      if (
        previous
        && next.photoScale === previous.photoScale
        && next.photoOffsetX === previous.photoOffsetX
        && next.photoOffsetY === previous.photoOffsetY
        && next.overlayScale === previous.overlayScale
        && next.overlayOffsetX === previous.overlayOffsetX
        && next.overlayOffsetY === previous.overlayOffsetY
      ) {
        return;
      }

      runOnJS(updateDraft)({
        photoScale: Number(next.photoScale.toFixed(3)),
        photoOffsetX: Number(next.photoOffsetX.toFixed(1)),
        photoOffsetY: Number(next.photoOffsetY.toFixed(1)),
        overlayScale: Number(next.overlayScale.toFixed(3)),
        overlayOffsetX: Number(next.overlayOffsetX.toFixed(1)),
        overlayOffsetY: Number(next.overlayOffsetY.toFixed(1)),
      });
    },
  );

  const editorGesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Pan()
      .onBegin(() => {
        gestureStartX.value = adjustModeValue.value === 0 ? draftPhotoOffsetX.value : draftOverlayOffsetX.value;
        gestureStartY.value = adjustModeValue.value === 0 ? draftPhotoOffsetY.value : draftOverlayOffsetY.value;
      })
      .onUpdate((event) => {
        if (adjustModeValue.value === 0) {
          draftPhotoOffsetX.value = gestureStartX.value + event.translationX;
          draftPhotoOffsetY.value = gestureStartY.value + event.translationY;
          return;
        }
        draftOverlayOffsetX.value = gestureStartX.value + event.translationX;
        draftOverlayOffsetY.value = gestureStartY.value + event.translationY;
      }),
    Gesture.Pinch()
      .onBegin(() => {
        gestureStartScale.value = adjustModeValue.value === 0 ? draftPhotoScale.value : draftOverlayScale.value;
      })
      .onUpdate((event) => {
        const nextScale = Math.max(0.6, Math.min(3, gestureStartScale.value * event.scale));
        if (adjustModeValue.value === 0) {
          draftPhotoScale.value = nextScale;
          return;
        }
        draftOverlayScale.value = nextScale;
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
  ]);

  const handleChoosePhoto = async () => {
    try {
      triggerLightHaptic();
      const pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      updateDraft({
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
                photoUri={draft.photoUri}
                templateId={draft.templateId}
                fuelPricePerLiter={latestFuelPrice}
                photoScale={draft.photoScale}
                photoOffsetX={draft.photoOffsetX}
                photoOffsetY={draft.photoOffsetY}
                overlayScale={draft.overlayScale}
                overlayOffsetX={draft.overlayOffsetX}
                overlayOffsetY={draft.overlayOffsetY}
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
