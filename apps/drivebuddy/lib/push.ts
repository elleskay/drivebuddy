/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-enum-comparison --
   expo-notifications and expo-constants types do not resolve under the linter's
   project service (they do under tsc, which stays the type gate for this file). */
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";

// Show alerts/badges/sounds while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
});

let lastToken: string | null = null;

/**
 * Ask for permission, fetch the Expo push token, and register it with the API.
 * Best-effort: on a simulator, when permission is denied, or when no EAS
 * projectId is configured (push tokens need one), it returns null and the app
 * keeps working with the in-app notification center only.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    // Without an EAS project, getExpoPushTokenAsync throws. Skip cleanly when
    // the app runs without EAS configured (e.g. bare expo start).
    console.warn("push: no EAS projectId; skipping push token registration");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    lastToken = token;
    await api.registerDevice(token, Platform.OS === "ios" ? "ios" : "android");
    return token;
  } catch (err) {
    console.warn(`push: token registration failed: ${(err as Error).message}`);
    return null;
  }
}

/** Unregister the current device token (called on sign-out). */
export async function unregisterPush(): Promise<void> {
  if (!lastToken) return;
  try {
    await api.unregisterDevice(lastToken);
  } catch {
    // ignore: token is purged server-side on send failure anyway
  }
  lastToken = null;
}
