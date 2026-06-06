import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";
// Registers the background location task (TaskManager.defineTask) at app start.
import "@/lib/location-task";

// On web the app is served full-window, which stretches the phone UI across the
// whole browser. Constrain it to a centered phone-width column on a neutral page
// so the web demo reads like the mobile app. No-op on native.
function DeviceFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <View style={frame.page}>
      <View style={[frame.column, webShadow]}>{children}</View>
    </View>
  );
}

// boxShadow is a valid react-native-web style but not in the RN types.
const webShadow = { boxShadow: "0 0 48px rgba(15,23,42,0.14)" } as unknown as ViewStyle;

const frame = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#dbe3ee",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  // A phone-shaped window (matches the 1080x2400 device ratio), centered, so the
  // web demo reads as a mobile app rather than a full-height column. Clamps to
  // the viewport on smaller screens.
  column: {
    width: 412,
    height: 915,
    maxWidth: "100%",
    maxHeight: "100%",
    backgroundColor: "#f5f7fb",
    borderRadius: 28,
    overflow: "hidden",
  },
});

function Gate() {
  const { ready, signedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "login" || segments[0] === "register";
    if (!signedIn && !inAuthGroup) router.replace("/login");
    else if (signedIn && inAuthGroup) router.replace("/");
  }, [ready, signedIn, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f7fb" }}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#f5f7fb" },
        headerTintColor: "#0f172a",
        headerTitle: "DriveBuddy",
        contentStyle: { backgroundColor: "#f5f7fb" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="vehicles" options={{ title: "My Vehicles" }} />
      <Stack.Screen name="recommendations" options={{ title: "Recommendations" }} />
      <Stack.Screen name="trip/[routeId]" options={{ title: "Trip Summary" }} />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerRight: () => (
            <Pressable onPress={() => router.push("/notification-settings")} hitSlop={10}>
              <Text style={{ color: "#2563eb", fontSize: 14, fontWeight: "600" }}>Settings</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="notification-settings" options={{ title: "Notification Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <DeviceFrame>
        <Gate />
      </DeviceFrame>
    </AuthProvider>
  );
}
