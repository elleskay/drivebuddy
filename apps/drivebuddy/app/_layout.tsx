import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth-context";
// Registers the background location task (TaskManager.defineTask) at app start.
import "@/lib/location-task";

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b1220" }}>
        <ActivityIndicator color="#4f8cff" size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0b1220" },
        headerTintColor: "#e7eefc",
        headerTitle: "DriveBuddy",
        contentStyle: { backgroundColor: "#0b1220" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "DriveBuddy",
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
              <Text style={{ color: "#4f8cff", fontSize: 14, fontWeight: "600" }}>Settings</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="vehicles" options={{ title: "My Vehicles" }} />
      <Stack.Screen name="dashboard" options={{ title: "Live Info" }} />
      <Stack.Screen name="assistant" options={{ title: "AI Assistant" }} />
      <Stack.Screen name="journey" options={{ title: "Journey" }} />
      <Stack.Screen name="history" options={{ title: "Trip History" }} />
      <Stack.Screen name="recommendations" options={{ title: "Recommendations" }} />
      <Stack.Screen name="trip/[routeId]" options={{ title: "Trip Summary" }} />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerRight: () => (
            <Pressable onPress={() => router.push("/notification-settings")} hitSlop={10}>
              <Text style={{ color: "#4f8cff", fontSize: 14, fontWeight: "600" }}>Settings</Text>
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
      <StatusBar style="light" />
      <Gate />
    </AuthProvider>
  );
}
