import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBoardMutations } from '@/hooks/use-kurbada-data';
import { getMapboxModule } from '@/lib/mapbox';
import type { RidePace } from '@/types/domain';

const paceOptions: { value: RidePace; label: string }[] = [
  { value: 'chill', label: 'Chill' },
  { value: 'moderate', label: 'Sakto lang' },
  { value: 'sporty', label: 'Kamote' },
];

function isValidLobbyUrl(url: string) {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function CreateRideScreen() {
  const { session } = useAuth();
  const { createRideListing } = useBoardMutations(session?.user.id);
  const Mapbox = getMapboxModule();

  const [meetupPoint, setMeetupPoint] = useState('');
  const [meetupCoords, setMeetupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPin, setShowMapPin] = useState(false);
  const [destination, setDestination] = useState('');
  const [rideDate, setRideDate] = useState(new Date(Date.now() + 86_400_000));
  const [pace, setPace] = useState<RidePace>('moderate');
  const [lobbyLink, setLobbyLink] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handlePost = async () => {
    if (!meetupPoint.trim() || !destination.trim()) {
      Alert.alert('Missing fields', 'Please fill in the meetup point and destination.');
      return;
    }

    if (!isValidLobbyUrl(lobbyLink)) {
      Alert.alert('Invalid lobby link', 'Please enter a valid ride lobby URL.');
      return;
    }

    await createRideListing.mutateAsync({
      host_user_id: session?.user.id ?? '',
      meetup_point: meetupPoint.trim(),
      meetup_coordinates: meetupCoords,
      destination: destination.trim(),
      ride_date: rideDate.toISOString(),
      pace,
      lobby_link: lobbyLink.trim(),
      display_name: session?.user.user_metadata.display_name ?? 'Kurbada Rider',
    });

    router.back();
  };

  return (
    <AppScrollScreen contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 18 }}>
      <View style={{ gap: 8, paddingTop: 8 }}>
        <AppText variant="eyebrow">Create Ride</AppText>
        <AppText variant="screenTitle">Post a group ride.</AppText>
        <AppText variant="body">
          Set the meetup, pace, and add the chat or group link riders should join.
        </AppText>
      </View>

      <GlassCard style={{ padding: 18, gap: 12 }}>
        <FloatingField label="Meetup Point" value={meetupPoint} onChangeText={setMeetupPoint} placeholder="Shell Marcos Highway" />

        {Mapbox && (
          <Button
            title={showMapPin ? 'Remove Map Pin' : '+ Pin Location on Map'}
            variant="ghost"
            onPress={() => setShowMapPin(!showMapPin)}
          />
        )}

        {showMapPin && Mapbox && (
          <View style={{ height: 180, borderRadius: radius.md, overflow: 'hidden' }}>
            <Mapbox.MapView
              style={{ flex: 1 }}
              styleURL="mapbox://styles/mapbox/light-v11"
              attributionEnabled={false}
              logoEnabled={false}
              compassEnabled={false}
              scaleBarEnabled={false}
              onPress={(feature: any) => {
                const [lng, lat] = feature.geometry.coordinates;
                setMeetupCoords({ lat, lng });
              }}>
              <Mapbox.Camera zoomLevel={11} centerCoordinate={[121.0, 14.58]} animationMode="none" />
              {meetupCoords ? (
                <Mapbox.ShapeSource id="meetup-pin" shape={{ type: 'Point', coordinates: [meetupCoords.lng, meetupCoords.lat] }}>
                  <Mapbox.CircleLayer
                    id="pin-circle"
                    style={{ circleColor: palette.danger, circleRadius: 10, circleStrokeWidth: 2, circleStrokeColor: '#FFFFFF' }}
                  />
                </Mapbox.ShapeSource>
              ) : null}
            </Mapbox.MapView>
          </View>
        )}

        <FloatingField label="Destination / Route" value={destination} onChangeText={setDestination} placeholder="Marilaque to Infanta" />

        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Date & Time</AppText>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: palette.surfaceMuted, borderWidth: 0.5, borderColor: palette.border }}>
            <AppText variant="body">{rideDate.toLocaleDateString('en-PH', { dateStyle: 'full' })}</AppText>
          </Pressable>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: palette.surfaceMuted, borderWidth: 0.5, borderColor: palette.border }}>
            <AppText variant="body">{rideDate.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</AppText>
          </Pressable>
        </View>

        {(showDatePicker || showTimePicker) && (
          <DateTimePicker
            value={rideDate}
            mode={showDatePicker ? 'date' : 'time'}
            onChange={(_event, selectedDate) => {
              setShowDatePicker(false);
              setShowTimePicker(false);
              if (selectedDate) {
                setRideDate((prev) => {
                  const d = new Date(prev);
                  if (showDatePicker) {
                    d.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                  } else {
                    d.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                  }
                  return d;
                });
              }
            }}
          />
        )}

        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Pace</AppText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {paceOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setPace(option.value)}
                style={{
                  flex: 1,
                  borderRadius: radius.sm,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: pace === option.value ? palette.surfaceStrong : palette.surface,
                  borderWidth: 0.5,
                  borderColor: pace === option.value ? palette.dividerStrong : palette.border,
                }}>
                <AppText variant="button" style={{ color: pace === option.value ? palette.text : palette.textSecondary, fontSize: 12 }}>
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <FloatingField
          label="Lobby Link"
          value={lobbyLink}
          onChangeText={setLobbyLink}
          placeholder="https://chat.whatsapp.com/... or your group URL"
          keyboardType="url"
          autoCapitalize="none"
        />
      </GlassCard>

      <Button title="Post Ride" onPress={handlePost} style={{ backgroundColor: palette.danger }} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </AppScrollScreen>
  );
}
