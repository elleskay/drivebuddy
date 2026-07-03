# Mobile runbook

Everything specific to building, signing, and shipping the Expo app. DriveBuddy
is a managed-workflow Expo app: no custom native modules, but three native
capabilities need real device configuration and store-review care: background
location, push notifications, and microphone/speech.

## Native capabilities

| Capability          | How it works                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Background location | `expo-location` + `expo-task-manager` task (`lib/location-task.ts`), Android foreground service         |
| Push notifications  | Expo push (APNs/FCM under the hood) via `expo-notifications`; tokens registered with the API            |
| Voice               | `expo-av` recording -> API (Transcribe + Claude + Polly) -> playback; `expo-speech` for in-drive alerts |

The managed workflow generates `ios/` and `android/` at build time
(`expo prebuild`); do not commit or hand-edit them.

## Local builds (prerequisites)

EAS builds in the cloud, so day-to-day you do not need a local toolchain. For a
local Android build (`cd android && ./gradlew assembleRelease` after prebuild),
the Android Gradle Plugin requires JDK 17+. Point `JAVA_HOME` at a 17+ JDK,
e.g. Android Studio's bundled runtime:

```bash
# Windows (Android Studio JBR is JDK 21, which AGP accepts)
JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" ./gradlew.bat assembleRelease
```

## EAS setup

```bash
npm i -g eas-cli
eas login
cd apps/drivebuddy
eas init                  # links the EAS project, writes the project id
eas credentials           # iOS/Android signing, when you build
```

Set `EXPO_TOKEN` as a GitHub secret for the CI build workflow
(`.github/workflows/mobile-build.yml`). `EXPO_PUBLIC_API_URL` (build-time,
public) is set per profile in `eas.json`.

## Build vs OTA

- New native capability (permission, native dep, SDK upgrade): full
  `eas build`, then store submit. OTA cannot ship native changes.
- JS/asset-only change: `eas update` to the channel. Instant, no review.

## Store review notes

- **Background location draws extra scrutiny on both stores.** Declare the
  purpose (drive recording started explicitly by the user), show the iOS
  blue-bar / Android foreground-service notification honestly, and provide a
  demo account plus a short walkthrough in the review notes.
- Android: the foreground service type is `location`; Play requires the
  in-app prominent disclosure before requesting background permission.
- iOS: request "While Using" first; the upgrade to "Always" happens in
  Settings, so the journey screen must work with foreground-only permission
  (it does: it falls back to foreground tracking).
- Microphone: only active while the user holds/toggles recording on the
  assistant screen; say so in the review notes.

## Testing on device

Background recording and push cannot be exercised by simulators or JS tests.
Before a release, verify on a physical device: start a drive, lock the phone,
drive (or walk) a few hundred metres, stop, and confirm the trip summary shows
the full route and a push arrives for the trip summary.
