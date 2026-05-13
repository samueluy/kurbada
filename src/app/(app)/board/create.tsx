import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { FloatingField } from "@/components/ui/floating-field";
import { GlassCard } from "@/components/ui/glass-card";
import { palette, radius } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useBoardMutations, useRideListings } from "@/hooks/use-kurbada-data";
import { triggerLightHaptic, triggerSuccessHaptic } from "@/lib/haptics";
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
  const [mapSearchBusy, setMapSearchBusy] = useState(false);
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
  const [androidPickerMode, setAndroidPickerMode] = useState<"date" | "time" | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    if (!existingListing) return;
    setTitle(existingListing.title?.trim() || existingListing.destination);
    setMeetupPoint(existingListing.meetup_point);
    setMeetupCoords(existingListing.meetup_coordinates ?? null);
    setDestination(existingListing.destination);
    setCity(existingListing.city ?? "");
    setRideDate(new Date(existingListing.ride_date));
    setMapCenter(
      existingListing.meetup_coordinates
        ? [existingListing.meetup_coordinates.lng, existingListing.meetup_coordinates.lat]
        : null,
    );
    setPace(existingListing.pace);
    setLobbyPlatform(existingListing.lobby_platform ?? "messenger");
    setLobbyLink(existingListing.lobby_link ?? "");
  }, [existingListing]);

  const handleMapSearch = async () => {
    const query = mapSearch.trim();
    if (!query || !env.mapboxToken) return;

    setMapSearchBusy(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(env.mapboxToken)}&limit=1&country=PH`,
      );
      const payload = await response.json();
      const feature = payload?.features?.[0];

      if (!feature?.center?.length) {
        Alert.alert("No results", "Try a more specific place or landmark.");
        return;
      }

      setMapCenter([feature.center[0], feature.center[1]]);
    } catch (error) {
      Alert.alert(
        "Search failed",
        error instanceof Error ? error.message : "Could not look up that place.",
      );
    } finally {
      setMapSearchBusy(false);
    }
  };

  const handleMapPress = (event: any) => {
    const coordinates = event?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;
    setMeetupCoords({ lng: coordinates[0], lat: coordinates[1] });
    setMapCenter([coordinates[0], coordinates[1]]);
  };

  const handleOpenDatePicker = () => {
    if (Platform.OS === "android") {
      setAndroidPickerMode("date");
      return;
    }
    setShowDateTimePicker(true);
  };

  const handleAndroidDateChange = (event: any, selectedDate?: Date) => {
    if (event?.type === "dismissed" || !selectedDate) {
      setAndroidPickerMode(null);
      return;
    }

    if (androidPickerMode === "date") {
      const nextDate = new Date(rideDate);
      nextDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      setRideDate(nextDate);
      setAndroidPickerMode("time");
      return;
    }

    const nextDate = new Date(rideDate);
    nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setRideDate(nextDate);
    setAndroidPickerMode(null);
  };

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

    triggerSuccessHaptic();
    router.back();
  };

  return (
    <AppScreen style={{ paddingHorizontal: 0, paddingTop: 0 }} showWordmark={false}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
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
            onPress={() => {
              triggerLightHaptic();
              setShowMapPin(!showMapPin);
              if (!showMapPin && !mapCenter) {
                setMapCenter(
                  meetupCoords
                    ? [meetupCoords.lng, meetupCoords.lat]
                    : [121.0437, 14.5995],
                );
              }
            }}
            />
          )}

        {Mapbox && showMapPin ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <FloatingField
                  label="Search Landmark or Area"
                  value={mapSearch}
                  onChangeText={setMapSearch}
                  placeholder="Marcos Highway, Antipolo"
                />
              </View>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  void handleMapSearch();
                }}
                style={{
                  paddingHorizontal: 14,
                  borderRadius: radius.sm,
                  backgroundColor: palette.surfaceStrong,
                  borderWidth: 0.5,
                  borderColor: palette.border,
                  justifyContent: "center",
                }}
              >
                <AppText variant="button" style={{ color: palette.textSecondary, fontSize: 12 }}>
                  {mapSearchBusy ? "..." : "Find"}
                </AppText>
              </Pressable>
            </View>

            <View
              style={{ height: 220, borderRadius: radius.md, overflow: "hidden", borderWidth: 0.5, borderColor: palette.border }}
              onTouchStart={() => setScrollEnabled(false)}
              onTouchMove={() => setScrollEnabled(false)}
              onTouchEnd={() => setScrollEnabled(true)}
              onTouchCancel={() => setScrollEnabled(true)}
            >
              <Mapbox.MapView
                style={{ flex: 1 }}
                styleURL="mapbox://styles/mapbox/dark-v11"
                onPress={handleMapPress}
                onLongPress={handleMapPress}
                onMapIdle={() => setScrollEnabled(true)}
                attributionEnabled={false}
                logoEnabled={false}
                compassEnabled
              >
                <Mapbox.Camera
                  centerCoordinate={meetupCoords ? [meetupCoords.lng, meetupCoords.lat] : mapCenter ?? [121.0437, 14.5995]}
                  zoomLevel={meetupCoords || mapCenter ? 13 : 10}
                  animationMode="easeTo"
                />
                {meetupCoords ? (
                  <Mapbox.ShapeSource
                    id="ride-create-pin"
                    shape={{
                      type: "Feature",
                      geometry: {
                        type: "Point",
                        coordinates: [meetupCoords.lng, meetupCoords.lat],
                      },
                      properties: {},
                    }}
                  >
                    <Mapbox.CircleLayer
                      id="ride-create-pin-circle"
                      style={{ circleColor: palette.danger, circleRadius: 8, circleStrokeColor: "#FFFFFF", circleStrokeWidth: 2 }}
                    />
                  </Mapbox.ShapeSource>
                ) : null}
              </Mapbox.MapView>
            </View>

            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Tap or long-press on the map to drop the meetup pin.
            </AppText>
            {meetupCoords ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <AppText variant="meta" style={{ color: palette.textSecondary, flex: 1 }}>
                  Pin set at {meetupCoords.lat.toFixed(5)}, {meetupCoords.lng.toFixed(5)}
                </AppText>
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    setMeetupCoords(null);
                  }}>
                  <AppText variant="button" style={{ color: palette.danger, fontSize: 12 }}>
                    Clear Pin
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

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
            onPress={handleOpenDatePicker}
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

        {Platform.OS !== "android" && showDateTimePicker ? (
          <DateTimePicker
            value={rideDate}
            mode="datetime"
            display="default"
            onChange={(_event, selectedDate) => {
              setShowDateTimePicker(false);
              if (selectedDate) setRideDate(selectedDate);
            }}
          />
        ) : null}

        {Platform.OS === "android" && androidPickerMode ? (
          <DateTimePicker
            value={rideDate}
            mode={androidPickerMode}
            display="default"
            onChange={handleAndroidDateChange}
          />
        ) : null}

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
                onPress={() => {
                  triggerLightHaptic();
                  setPace(option.value);
                }}
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
                  onPress={() => {
                    triggerLightHaptic();
                    setLobbyPlatform(option.value);
                  }}
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
            Meetup-only ride. Riders will just follow the meetup details and date.
          </AppText>
        )}
      </GlassCard>

      <Button
        title={existingListing ? "Save Changes" : "Post Ride"}
        onPress={() => {
          triggerLightHaptic();
          void handlePost();
        }}
        disabled={rideDate.getTime() < Date.now() || rideDate.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000}
        style={{ backgroundColor: palette.danger }}
      />
      <Button
        title="Cancel"
        variant="ghost"
        onPress={() => {
          triggerLightHaptic();
          router.back();
        }}
      />
      </ScrollView>
    </AppScreen>
  );
}
