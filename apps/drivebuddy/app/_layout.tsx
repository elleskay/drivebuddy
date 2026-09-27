import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { ThemeProvider as NavigationThemeProvider, type Theme } from "@react-navigation/native";
import { useFonts } from "expo-font";
// Per-weight entry points so only these four font files ship in the bundle.
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { Geist_700Bold } from "@expo-google-fonts/geist/700Bold";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider, useAppearance, useTheme } from "@/lib/theme-context";
import { IconButton } from "@/components/ui";
// Registers the background location task (TaskManager.defineTask) at app start.
import "@/lib/location-task";

// On web the app is served full-window, which stretches the phone UI across the
// whole browser. Constrain it to a centered phone-shaped window (matches the
// 1080x2400 device ratio) so the web demo reads like the mobile app. Clamps to
// the viewport on smaller screens. No-op on native.
function DeviceFrame({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <View style={[frame.page, { backgroundColor: t.scheme === "dark" ? "#000000" : "#E2E5EA" }]}>
      <View style={[frame.column, { backgroundColor: t.color.bg }, webShadow]}>{children}</View>
    </View>
  );
}

// boxShadow is a valid react-native-web style but not in the RN types.
const webShadow = { boxShadow: "0 24px 80px rgba(0,0,0,0.22)" } as unknown as ViewStyle;

const frame = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  column: {
    width: 412,
    height: 915,
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 36,
    overflow: "hidden",
  },
});

function Gate() {
  const t = useTheme();
  const { ready: appearanceReady } = useAppearance();
  const { ready, signedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  // A font failure falls back to the system font rather than blocking launch.
  const booted = ready && appearanceReady && (fontsLoaded || !!fontError);

  // React Navigation paints its container and headers from this theme; without
  // it the default light grey (#F2F2F2) shows behind screens in dark mode.
  const navTheme = useMemo<Theme>(
    () => ({
      dark: t.scheme === "dark",
      colors: {
        primary: t.color.accentInk,
        background: t.color.bg,
        card: t.color.bg,
        text: t.color.text,
        border: t.color.border,
        notification: t.color.dangerSolid,
      },
    }),
    [t],
  );

  // Redirect only once the Stack below is mounted; expo-router throws if we
  // navigate while the loading view is still showing.
  useEffect(() => {
    if (!booted) return;
    const inAuthGroup = segments[0] === "login" || segments[0] === "register";
    if (!signedIn && !inAuthGroup) router.replace("/login");
    else if (signedIn && inAuthGroup) router.replace("/");
  }, [booted, signedIn, segments, router]);

  if (!booted) {
    return (
      <View style={[styles.loading, { backgroundColor: t.color.bg }]}>
        <ActivityIndicator color={t.color.accentInk} size="large" />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          // Screens draw large titles in their content; the header keeps only
          // the back button. `title` still names the page (web tab title).
          headerTitle: "",
          headerBackTitleVisible: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.color.bg },
          headerTintColor: t.color.text,
          contentStyle: { backgroundColor: t.color.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "DriveBuddy" }} />
        <Stack.Screen name="login" options={{ headerShown: false, title: "Sign in" }} />
        <Stack.Screen name="register" options={{ headerShown: false, title: "Create account" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="vehicles" options={{ title: "My vehicles" }} />
        <Stack.Screen name="recommendations" options={{ title: "Insights" }} />
        <Stack.Screen name="trip/[routeId]" options={{ title: "Trip summary" }} />
        <Stack.Screen
          name="notifications"
          options={{
            title: "Notifications",
            headerRight: () => (
              <IconButton
                icon="options-outline"
                variant="plain"
                size={40}
                accessibilityLabel="Notification settings"
                onPress={() => router.push("/notification-settings")}
              />
            ),
          }}
        />
        <Stack.Screen name="notification-settings" options={{ title: "Notification settings" }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

function Chrome() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
      <DeviceFrame>
        <Gate />
      </DeviceFrame>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Chrome />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
