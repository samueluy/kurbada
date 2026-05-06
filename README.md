# Kurbada

Kurbada is an Expo Router motorcycle companion app for Filipino riders. The current scaffold targets iOS-first development builds with Supabase, RevenueCat, Mapbox, local ride telemetry, fuel logs, maintenance tracking, emergency QR generation, and share-card export.

## Local setup

1. Copy `.env.example` to `.env` and fill in the public Expo vars plus the server-side bootstrap vars.
2. Install dependencies:

```bash
npm install
```

3. Prebuild native projects when you need a fresh dev build:

```bash
npm run prebuild
```

4. Run the app:

```bash
npm run ios
```

## Environment

Client app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_REVENUECAT_ENABLED`
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_DEV_BYPASS_APP_GATE`

Bootstrap / server-side:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KURBADA_DEV_PASSWORD`
- `KURBADA_APPLE_REVIEW_PASSWORD`

## Special users

Seed the development and Apple review accounts with:

```bash
npm run bootstrap:special-users
```

This creates or updates:

- `dev@kurbada.local`
- `apple-review@kurbada.app`

For local UI work, set `EXPO_PUBLIC_DEV_BYPASS_APP_GATE=true` to skip onboarding and auth and jump straight into the in-app routes.

The app review notes template lives in [docs/apple-review-notes.md](/Users/samueluy/Documents/GitHub/kurbada/docs/apple-review-notes.md).

## Supabase

The initial database schema and RLS policies live in [supabase/migrations/20260506180000_kurbada_mvp.sql](/Users/samueluy/Documents/GitHub/kurbada/supabase/migrations/20260506180000_kurbada_mvp.sql).

## Checks

```bash
npm run typecheck
npm run lint
```
