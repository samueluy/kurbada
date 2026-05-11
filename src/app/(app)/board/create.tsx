import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";

import { AppScrollScreen } from "@/components/ui/app-screen";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { FloatingField } from "@/components/ui/floating-field";
import { GlassCard } from "@/components/ui/glass-card";
import { palette, radius } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useBoardMutations, useRideListings } from "@/hooks/use-kurbada-data";
import { env } from "@/lib/env";
import { getMapboxModule } from "@/lib/mapbox";
import type { LobbyPlatform, RidePace } from "@/types/domain";

const lobbyPlatformOptions: { value: LobbyPlatform; label: string }[] = [
  { value: "messenger", label: "Messenger" },
  { value: "telegram", label: "Telegram" },
  { value: "none", label: "None (meetup only)" },
];

const paceOptions: { value: RidePace; label: string }[] = [
  { value: "chill", label: "Chill" },
  { value: "moderate", label: "Sakto lang" },
  { value: "sporty", label: "Kamote" },
];

function isValidLobbyUrl(url: string) {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function CreateRideScreen() {
  const { session } = useAuth();
  const listings = useRideListings(session?.user.id);
  const { createRideListing, updateRideListing } = useBoardMutations(
    session?.user.id,
  );
  const Mapbox = getMapboxModule();
  const params = useLocalSearchParams<{ listingId?: string }>();
  const listingId = params?.listingId;
  const existingListing = useMemo(
    () =>
      listingId
        ? (listings.data?.find((item) => item.id === listingId) ?? null)
        : null,
    [listingId, listings.data],
  );

  const [title, setTitle] = useState("");
  const [meetupPoint, setMeetupPoint] = useState("");
  const [meetupCoords, setMeetupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapSearch, setMapSearch] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [showMapPin, setShowMapPin] = useState(false);
  const [destination, setDestination] = useState("");
  const [city, setCity] = useState("");
  const [rideDate, setRideDate] = useState(
    () => new Date(Date.now() + 86_400_000),
  );
  const [pace, setPace] = useState<RidePace>("moderate");
  const [lobbyPlatform, setLobbyPlatform] =
    useState<LobbyPlatform>("messenger");
  const [lobbyLink, setLobbyLink] = useState("");
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  useEffect(() => {
    if (!existingListing) return;
    setTitle(existingListing.title?.trim() || existingListing.destination);
    setMeetupPoint(existingListing.meetup_point);
    setMeetupCoords(existingListing.meetup_coordinates ?? null);
    setDestination(existingListing.destination);
    setCity(existingListing.city ?? "");
    setRideDate(new Date(existingListing.ride_date));
    setPace(existingListing.pace);
    setLobbyPlatform(existingListing.lobby_platform ?? "messenger");
    setLobbyLink(existingListing.lobby_link ?? "");
  }, [existingListing]);

  const handlePost = async () => {
    if (!title.trim() || !meetupPoint.trim() || !destination.trim()) {
      Alert.alert(
        "Missing fields",
        "Please fill in the ride title, meetup point, and destination.",
      );
      return;
    }

    if (lobbyPlatform !== "none" && !isValidLobbyUrl(lobbyLink)) {
      Alert.alert("Invalid lobby link", "Please enter a valid ride lobby URL.");
      return;
    }

    const payload = {
      host_user_id: session?.user.id ?? "",
      title: title.trim(),
      meetup_point: meetupPoint.trim(),
      meetup_coordinates: meetupCoords,
      destination: destination.trim(),
      ride_date: rideDate.toISOString(),
      pace,
      lobby_platform: lobbyPlatform,
      lobby_link: lobbyPlatform === "none" ? null : lobbyLink.trim(),
      display_name: session?.user.user_metadata.display_name ?? "Kurbada Rider",
      city: city.trim() || null,
    };

    if (existingListing) {
      await updateRideListing.mutateAsync({ ...existingListing, ...payload });
    } else {
      await createRideListing.mutateAsync(payload);
    }

    router.back();
  };

  return (
    <AppScrollScreen
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 18,
      }}
    >
      <View style={{ gap: 8, paddingTop: 8 }}>
        <AppText variant="eyebrow">Create Ride</AppText>
        <AppText variant="screenTitle">
          {existingListing ? "Edit your group ride." : "Post a group ride."}
        </AppText>
        <AppText variant="body">
          Set the meetup, pace, and add the chat or group link riders should
          join.
        </AppText>
      </View>

      <GlassCard style={{ padding: 18, gap: 12 }}>
        <FloatingField
          label="Ride Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Sunday Marilaque Sweep"
        />
        <FloatingField
          label="Meetup Point"
          value={meetupPoint}
          onChangeText={setMeetupPoint}
          placeholder="Shell Marcos Highway"
        />

        {Mapbox && (
          <Button
            title={showMapPin ? "Remove Map Pin" : "+ Pin Location on Map"}
            variant="ghost"
            onPress={() => setShowMapPin(!showMapPin)}
            />
          )}

        <FloatingField
          label="Destination / Route"
          value={destination}
          onChangeText={setDestination}
          placeholder="Marilaque to Infanta"
        />
        <FloatingField
          label="City (optional)"
          value={city}
          onChangeText={setCity}
          placeholder="Metro Manila"
          autoCapitalize="words"
        />

        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Date & Time</AppText>
          <Pressable
            onPress={() => setShowDateTimePicker(true)}
            style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: palette.surfaceMuted, borderWidth: 0.5, borderColor: palette.border }}>
            <AppText variant="body">
              {rideDate.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })} · {rideDate.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
            </AppText>
          </Pressable>
          {rideDate.getTime() < Date.now() ? (
            <AppText variant="meta" style={{ color: palette.danger, fontSize: 12, marginTop: 4 }}>Date must be in the future</AppText>
          ) : rideDate.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000 ? (
            <AppText variant="meta" style={{ color: palette.danger, fontSize: 12, marginTop: 4 }}>Date must be within the next 12 months</AppText>
          ) : null}
        </View>

        {showDateTimePicker && (
          <DateTimePicker
            value={rideDate}
            mode="datetime"
            display="default"
            onChange={(_event, selectedDate) => {
              setShowDateTimePicker(false);
              if (selectedDate) setRideDate(selectedDate);
            }}
          />
        )}

        <View style={{ gap: 6 }}>
          <AppText
            variant="label"
            style={{ color: palette.textSecondary, fontSize: 12 }}
          >
            Pace
          </AppText>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {paceOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setPace(option.value)}
                style={{
                  flex: 1,
                  borderRadius: radius.sm,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor:
                    pace === option.value
                      ? palette.surfaceStrong
                      : palette.surface,
                  borderWidth: 0.5,
                  borderColor:
                    pace === option.value
                      ? palette.dividerStrong
                      : palette.border,
                }}
              >
                <AppText
                  variant="button"
                  style={{
                    color:
                      pace === option.value
                        ? palette.text
                        : palette.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <AppText
            variant="label"
            style={{ color: palette.textSecondary, fontSize: 12 }}
          >
            Lobby Platform
          </AppText>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {lobbyPlatformOptions.map((option) => {
              const active = lobbyPlatform === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setLobbyPlatform(option.value)}
                  style={{
                    borderRadius: radius.sm,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: active
                      ? palette.surfaceStrong
                      : palette.surface,
                    borderWidth: 0.5,
                    borderColor: active
                      ? palette.dividerStrong
                      : palette.border,
                  }}
                >
                  <AppText
                    variant="button"
                    style={{
                      color: active ? palette.text : palette.textSecondary,
                      fontSize: 12,
                    }}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {lobbyPlatform !== "none" ? (
          <FloatingField
            label="Lobby Link"
            value={lobbyLink}
            onChangeText={setLobbyLink}
            placeholder={
              lobbyPlatform === "telegram"
                ? "https://t.me/yourgroup"
                : "https://m.me/join/..."
            }
            keyboardType="url"
            autoCapitalize="none"
          />
        ) : (
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Bahala na kayo maghanapan jan haha - Sam
          </AppText>
        )}
      </GlassCard>

      <Button
        title={existingListing ? "Save Changes" : "Post Ride"}
        onPress={handlePost}
        disabled={rideDate.getTime() < Date.now() || rideDate.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000}
        style={{ backgroundColor: palette.danger }}
      />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </AppScrollScreen>
  );
}
