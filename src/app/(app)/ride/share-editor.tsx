import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import ViewShot, { releaseCapture } from 'react-native-view-shot';

import { IgStoryCanvas } from '@/components/ride/ig-story-canvas';
import { RouteReplayCanvas } from '@/components/ride/route-replay-canvas';
import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFuelLogs, useRideDetails } from '@/hooks/use-kurbada-data';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { exportRouteReplayAsync } from '@/lib/route-replay-exporter';
import { useRideShareStore } from '@/store/ride-share-store';

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;
const EXPORT_FPS = 24;

function waitForCaptureFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, Platform.OS === 'android' ? 45 : 30);
    });
  });
}

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
  const [captureProgress, setCaptureProgress] = useState(0);
  const [isExportingReplay, setIsExportingReplay] = useState(false);
  const replayShotRef = useRef<any>(null);
  const hydratedRideIdRef = useRef<string | null>(null);
  const editorDraftRef = useRef(draft);
  const [editorDraft, setEditorDraft] = useState(draft);
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
    draft,
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
    rideId,
  ]);

  const persistDraftFromEditor = () => {
    updateDraft(editorDraftRef.current);
  };

  const editorGesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Pan()
      .enabled(editorDraft.shareMode === 'story')
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
      .enabled(editorDraft.shareMode === 'story')
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
    editorDraft.shareMode,
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

  const handleExportReplay = async () => {
    const ride = rideQuery.data;
    if (!ride) return;

    setIsExportingReplay(true);
    const capturedUris: string[] = [];
    try {
      persistDraftFromEditor();
      const totalFrames = Math.max(24, Math.round(editorDraft.replayDurationSec * EXPORT_FPS));
      for (let index = 0; index < totalFrames; index += 1) {
        const nextProgress = totalFrames === 1 ? 1 : index / (totalFrames - 1);
        setCaptureProgress(nextProgress);
        await waitForCaptureFrame();
        const uri = await replayShotRef.current?.capture?.();
        if (!uri) {
          throw new Error('Could not capture replay frame.');
        }
        capturedUris.push(uri);
      }

      const exportedUri = await exportRouteReplayAsync({
        frameUris: capturedUris,
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        fps: EXPORT_FPS,
        outputFileName: `kurbada-route-replay-${ride.id}.mp4`,
      });

      triggerSuccessHaptic();
      await Sharing.shareAsync(exportedUri, {
        mimeType: 'video/mp4',
        dialogTitle: 'Share route replay',
      });
    } catch (error) {
      Alert.alert('Replay export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      capturedUris.forEach((uri) => {
        try {
          releaseCapture(uri);
        } catch {
          // ignore cleanup errors
        }
      });
      setCaptureProgress(0);
      setIsExportingReplay(false);
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
        <AppText variant="bodyBold">{editorDraft.shareMode === 'story' ? 'Adjust Share Card' : 'Route Replay'}</AppText>
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
                updateEditorDraft({ shareMode: 'story' });
              }}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: editorDraft.shareMode === 'story' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: editorDraft.shareMode === 'story' ? palette.background : palette.textSecondary }}>
                Story
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                updateEditorDraft({ shareMode: 'replay' });
              }}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: editorDraft.shareMode === 'replay' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: editorDraft.shareMode === 'replay' ? palette.background : palette.textSecondary }}>
                Replay
              </AppText>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                updateEditorDraft({ textTone: 'light' });
              }}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: editorDraft.textTone === 'light' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: editorDraft.textTone === 'light' ? palette.background : palette.textSecondary }}>
                White Text
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                updateEditorDraft({ textTone: 'dark' });
              }}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: editorDraft.textTone === 'dark' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: editorDraft.textTone === 'dark' ? palette.background : palette.textSecondary }}>
                Black Text
              </AppText>
            </Pressable>
          </View>

          <GestureDetector gesture={editorGesture}>
            <View style={{ alignItems: 'center' }}>
              {editorDraft.shareMode === 'story' ? (
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
                  textTone={editorDraft.textTone}
                />
              ) : (
                <RouteReplayCanvas
                  ride={ride}
                  templateId={editorDraft.templateId}
                  fuelPricePerLiter={latestFuelPrice}
                  width={300}
                  textTone={editorDraft.textTone}
                />
              )}
            </View>
          </GestureDetector>

          {editorDraft.shareMode === 'story' ? (
            <View style={{ gap: 8 }}>
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
          ) : (
            <View style={{ gap: 10 }}>
              <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 12 }}>
                Kurbada will render an 8-second vertical route replay on your phone, then open the share sheet for Instagram Reels.
              </AppText>
              {isExportingReplay ? (
                <AppText variant="meta" style={{ color: palette.text, textAlign: 'center' }}>
                  Rendering replay… {Math.round(captureProgress * 100)}%
                </AppText>
              ) : null}
              <Button
                title={isExportingReplay ? 'Rendering Replay…' : 'Export Route Replay'}
                onPress={() => void handleExportReplay()}
                disabled={isExportingReplay}
                style={{ backgroundColor: palette.danger }}
              />
            </View>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center' }}>
            Loading editor…
          </AppText>
        </ScrollView>
      )}

      {ride ? (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: EXPORT_WIDTH,
            height: EXPORT_HEIGHT,
            transform: [{ translateX: -10000 }],
          }}>
          <ViewShot
            ref={replayShotRef}
            options={{
              result: 'tmpfile',
              quality: 0.92,
              width: EXPORT_WIDTH,
              height: EXPORT_HEIGHT,
              format: 'jpg',
              handleGLSurfaceViewOnAndroid: true,
              useRenderInContext: true,
            }}>
            <RouteReplayCanvas
              ride={ride}
              templateId={editorDraft.templateId}
              fuelPricePerLiter={latestFuelPrice}
              width={EXPORT_WIDTH}
              hidden
              progress={captureProgress}
              textTone={editorDraft.textTone}
            />
          </ViewShot>
        </View>
      ) : null}
    </AppScreen>
  );
}
