# Closed Tester Issues — Root Causes + Fixes

**36 items from closed testers. Organized by category.**

---

## ONBOARDING (7 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | Emergency pre-seeded "Samuel Uy" | `OnboardingData.fullName` persisted from prior session in Zustand store | In `emergency.tsx`, change `useState(emergency.data ?? emptyEmergencyInfo)` → `useState(emptyEmergencyInfo)`. Verify store is cleared on fresh install |
| 2 | Garage data from onboarding not saved to user | `useOnboardingSync` requires all 5 bike fields (brand, model, year, cc, odometer) to be non-empty. If user skips any field, `hasBikeDraft` is false and sync never fires | Fix `hasBikeDraft` to only require `bikeBrand` + `bikeModel` (minimum viable). Auto-fill `bikeEngineCc` from model dropdown selection |
| 3 | Blood type defaults to O+ | `emptyEmergencyInfo.blood_type = 'O+'` and `onboardingData.bloodType = 'O+'` in store defaults | Change default to empty string `''`. Add "Select blood type" as first option. Make "I don't know" set `blood_type` to a sentinel like `'unknown'` |
| 4 | After sign out → sign in → "What's your ride?" | `resetForSignOut()` sets both `hasCompletedOnboarding` and `hasCompletedBikeSetup` to false. Returning user gets full onboarding again | Don't reset `hasCompletedBikeSetup` on sign out. Only reset `hasCompletedOnboarding`. Check `hasCompletedBikeSetup` in gate before redirecting to onboarding |
| 5 | Keyboard covers text boxes | `AppScreen` has no KeyboardAvoidingView. `AppScrollScreen` has hardcoded `keyboardVerticalOffset: 90` | Wrap AppScreen in KeyboardAvoidingView too. Change offset to use `useSafeAreaInsets().bottom` dynamically |
| 6 | Scooters default to 'naked' in dropdown | `bike-setup.tsx` doesn't auto-set category from model selection | When selecting a model, auto-detect category from engine CC: ≤200cc → scooter, other logic based on brand/model |
| 7 | Profile footer too much space | `AppScrollScreen.contentContainerStyle.paddingBottom: 160` | Reduce to `paddingBottom: 120` |

---

## NAV BAR (3 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 8 | Nav bar too big | `tabBarHeight: 60`, icons 22px | Change to `tabBarHeight: 56`, reduce icon size to 20px. Reduce `paddingTop` to 6px |
| 9 | Nav bar white bubble suffocating | Bubble width is 88% with tight padding. No text labels | Increase width to 94%, add text labels below icons on active tab. Remove green indicator dot in favor of bold text + icon fill |
| 10 | Too much space at footer | Same as #7 | Same fix |

---

## GARAGE / MAINTENANCE (6 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 11 | Add custom name for bikes | `Bike` type has `make`/`model` but no `nickname` field | Add `display_name` or `nickname` field to `Bike` type. Allow user to set custom name in garage. Show nickname on ride cards |
| 12 | Editing intervals does not persist | `updateMaintenanceTask` in `use-kurbada-data.ts` only sends `last_done_odometer_km` and `last_done_date` to Supabase — missing `interval_km` and `interval_days` | Add `interval_km` and `interval_days` to the Supabase update payload |
| 13 | Custom maintenance disappears after sign out | Local store tied to user session — wiped on sign out | Maintenance tasks should persist in Supabase (already do). Ensure local store syncs from Supabase on sign-in. The local store `resetForSignOut` clears everything — only clear session-specific data |
| 14 | "Interval updated" pop up overlapping | Toast positioned at `bottom: 40` which overlaps with tab bar | Move toast to `bottom: 100` (above tab bar) or use a top-positioned toast |
| 15 | Add edit odometer manually | Bike odometer only auto-updates from rides | Add "Edit Odometer" button in garage bike detail. Opens modal with numeric input. Updates `current_odometer_km` in Supabase + local store |
| 16 | Scooters default to naked instead of scooter | Bike category not auto-set from model | Fix in bike-model selection: when model is chosen, auto-detect category from CC + model type |

---

## AUTH / ACCESS (3 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 17 | Unsubscribed users can proceed to app | `useUserAccess` has `initialData: { hasAccess: true }` — briefly shows app then redirects. `access.isLoading` not considered | Remove `initialData` so `access.data` is undefined during loading. Show loading spinner while access is being determined. Only render app when `access.data?.hasAccess` is confirmed true |
| 18 | Paywall loops to onboarding | `hasCompletedOnboarding` is false when user comes from sign-in → paywall redirect | In paywall screen, if user has a session, call `completeOnboarding()` before showing the paywall |
| 19 | 7 days free trial button → immediate redirect | Paywall button handler uses `router.replace` which triggers gate re-check | After successful trial signup in paywall, call `completeOnboarding()` then `setPurchaseCompleted(true)` and `router.replace('/(public)/success')` |

---

## LOBBY / BOARD (6 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 20 | Add 'none' option on messaging platform | `paceOptions` doesn't include "No lobby" or "None" | Add a `lobbyPlatform` selector: "Messenger", "Telegram", "None (meetup only)". When "None", hide the lobby link field |
| 21 | Owner should see opt-ins, edit/delete posts | `board.tsx` only shows report button, no admin controls | Add owner check: if `session.user.id === listing.host_user_id`, show edit/delete buttons. Add attendees list (RSVP) visible to owner |
| 22 | Ride listing shows destination instead of title | `RideListingCard` renders `listing.destination` as the main text | Destination IS the title in the current schema. If a separate title field is needed, add `title` to `RideListing` type |
| 23 | Popups overlap when clicking listing | JoinLobbySheet + report button both trigger overlays | Use single modal state. When listing is tapped, show details in a bottom sheet with Join + Report + Close |
| 24 | RSVP does nothing | No RSVP functionality implemented | Remove RSVP button if it exists, or add a simple "I'm Going" toggle that increments a counter |
| 25 | Users can block themselves | No check preventing self-block | Add check: `if (userId === session.user.id) return;` in the block function |

---

## FUEL (5 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 26 | Fuel entry deletes after saving | `onPress={() => deleteFuelLog.mutate(item.id)}` — tapping any entry DELETES it | Change `onPress` to show detail view. Move delete to long-press or swipe with confirmation |
| 27 | Details input doesn't reset after logging | Form state persists after save | After successful `saveFuelLog`, reset all form fields to `''` |
| 28 | Fuel reports chart has black font | Chart library default color is black on dark theme | Pass `textColor: palette.text` to chart labels in `react-native-gifted-charts` config |
| 29 | Add 'Octane' text on selector | Octane pills (91/95/97/100) have no label | Add `<AppText variant="label">Octane</AppText>` above the pill row |
| 30 | Fuel price for liter should be swipe-downable | Input opens keyboard which blocks view | Fix #5 (KeyboardAvoidingView) handles this. If not, add dismiss on scroll |

---

## RIDE / TELEMETRY (4 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 31 | Distance, time, liters, cost not refreshing during ride | `setInterval` for `durationSeconds` uses `useEffect` with `[]` deps — captures stale `store.startedAt` (undefined at mount) | Read from `useRideStore.getState().startedAt` directly each tick instead of closing over it |
| 32 | Crash detection false positives | Hardcoded 4.5G threshold with no filtering. Single pothole spikes to 4-6G | Increase debounce from 150ms to 250ms. Add rolling average of last 5 readings. Consider making threshold configurable in settings |
| 33 | Daily ride card wrong margin on some devices | `RideFeedCard` flex layout may not account for wider screens | Check `flex: 1` on cards. May need `maxWidth` or percentage-based sizing |
| 34 | Some overlay text top/bottom halves cut off | Using `variant="label"` (lineHeight: 12) with larger fontSize overrides | Audit remaining `variant="label"` usages with fontSize > 12 and add explicit lineHeight |

---

## SHARE / OVERLAY (3 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 35 | "Share to Social" → just "Share" | Button text is too specific | Change button title to "Share". The native share sheet lets user choose platform |
| 36 | User should adjust image attachment | No image editing (zoom/pan/crop) before overlay | Add preview with pinch-to-zoom and pan gestures using `react-native-gesture-handler` + `react-native-reanimated` |

---

## OTHER (3 items)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 37 | Font too big with input over a million | StatCard mono value at `fontSize: 22` — 7-digit numbers overflow | Use `adjustsFontSizeToFit` + `numberOfLines={1}` or reduce fontSize for large values |
| 38 | Gear window shows non-related fillups | Profile stats aggregating wrong data source | Remove maintenance fields from profile stats. Add to Stats screen / Garage detail |
| 39 | Add maintenance cost tracking | No cost field on maintenance tasks | Add `cost` field to `MaintenanceTask` type. Accumulate in garage. Show in `/stats` screen |

---

## Priority Tiers

### P0 — Must fix before release (core features broken / data loss)

- **#31** — Ride telemetry not refreshing during ride
- **#26** — Fuel entries delete on single tap (data loss)
- **#12** — Maintenance interval edits not persisted to Supabase
- **#17** — Unsubscribed users briefly bypass paywall

### P1 — Critical UX (blocks or degrades key flows)

- **#4** — Returning user sees onboarding again after sign out + sign in
- **#5** — Keyboard covers text inputs on all screens
- **#32** — Crash detection triggers on normal potholes
- **#2** — Onboarding garage data not saved to user after sign-up

### P2 — Polish (UX improvements)

- Everything else

---

## File Change Map

| File | Issues |
|------|--------|
| `src/hooks/use-ride-session.ts` | #31, #32 |
| `src/app/(app)/(tabs)/fuel.tsx` | #26, #27, #29 |
| `src/hooks/use-kurbada-data.ts` | #12, #2 |
| `src/app/(app)/garage/[bikeId].tsx` | #12, #14, #15 |
| `src/app/(public)/emergency.tsx` | #3 |
| `src/store/app-store.ts` | #4, #3 |
| `src/app/index.tsx` | #4, #17 |
| `src/app/(app)/_layout.tsx` | #17 |
| `src/lib/access.ts` | #17 |
| `src/components/ui/app-screen.tsx` | #5, #7 |
| `src/components/navigation/custom-tab-bar.tsx` | #8, #9 |
| `src/constants/theme.ts` | #8, #9 |
| `src/app/(public)/bike-setup.tsx` | #2, #6 |
| `src/app/(app)/(tabs)/ride.tsx` | #33 |
| `src/features/fuel/components/fuel-entry-card.tsx` | #26 |
| `src/app/(app)/ride/summary.tsx` | #35 |
| `src/lib/bike-models.ts` | #11 |
| `src/types/domain.ts` | #11, #38 |
| `src/app/(app)/(tabs)/board.tsx` | #20, #21, #23 |
| `src/features/board/components/ride-listing-card.tsx` | #22, #25 |
| `src/app/(app)/profile/emergency.tsx` | #5 |
| `src/app/(public)/auth/sign-in.tsx` | #5 |
| `src/app/(public)/auth/sign-up.tsx` | #5 |
