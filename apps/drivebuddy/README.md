# DriveBuddy app

Expo (React Native) client for DriveBuddy: records drives with GPS in the
foreground and background, shows a live Singapore driving dashboard, plays
in-drive voice alerts, and talks to the AI assistant by voice or text. Also
exports to web (react-native-web) for the GitHub Pages demo.

## Screens

- `app/(tabs)/` - Home, Journey Mode (drive recording), Dashboard (live SG
  data), Assistant (voice/text AI), History
- `app/trip/[routeId].tsx` - post-drive summary: route on OpenStreetMap tiles
  plus itemised fuel/ERP cost
- `app/login.tsx`, `app/register.tsx` - email/password auth
- `app/vehicles.tsx`, `app/profile.tsx`, `app/settings.tsx`,
  `app/notifications.tsx`, `app/notification-settings.tsx`,
  `app/recommendations.tsx`

## Key modules

- `lib/api.ts` - typed API client; attaches the JWT and refreshes once on 401
- `lib/auth-context.tsx` - session state; tokens live in expo-secure-store
- `lib/location-task.ts` - background location task (expo-task-manager) that
  keeps posting GPS batches with the screen off
- `lib/push.ts` - Expo push registration (no-ops without an EAS project id)
- `lib/theme.ts` - shared colors/spacing/shadows

## Configuration

`EXPO_PUBLIC_API_URL` (build-time, public) points the app at the API; it falls
back to `expo.extra.apiUrl` in `app.json`, then localhost. Never put secrets in
`EXPO_PUBLIC_*` - anything in the bundle is public.

## Run

```bash
npm install          # from the repo root (workspace install)
npm run start        # Expo dev server (press w for web)
npm run typecheck
npm run lint
```

Native builds ship via EAS (`eas.json`); see `docs/MOBILE.md`.
