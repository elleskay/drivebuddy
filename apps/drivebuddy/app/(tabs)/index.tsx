import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { NavCard } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api
        .unreadCount()
        .then(({ count }) => setUnread(count))
        .catch(() => undefined);
    }, []),
  );

  // Drive / Live Info / Assistant / History are in the bottom tab bar; the grid
  // holds the remaining destinations.
  const tiles: { title: string; desc: string; route: string; badge?: number }[] = [
    { title: "Recommendations", desc: "Insights from your drives", route: "/recommendations" },
    { title: "Notifications", desc: "Alerts and trip summaries", route: "/notifications", badge: unread },
    { title: "My Vehicles", desc: "Manage your vehicles", route: "/vehicles" },
    { title: "Profile", desc: "Your personal details", route: "/profile" },
    { title: "Settings", desc: "App and account", route: "/settings" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.greeting}>Hi {user?.fullName?.split(" ")[0] ?? "there"}</Text>
        <Text style={styles.sub}>Welcome to DriveBuddy</Text>

        <NavCard
          title="Start a Drive"
          desc="Track your route, distance and cost"
          onPress={() => router.push("/journey")}
          primary
        />

        <View style={styles.grid}>
          {tiles.map((t) => (
            <NavCard
              key={t.route}
              title={t.title}
              desc={t.desc}
              badge={t.badge}
              onPress={() => router.push(t.route as never)}
              style={styles.tile}
            />
          ))}
        </View>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.tagline}>Drive smart. Drive safe.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { padding: spacing.lg, gap: spacing.md },
  greeting: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: spacing.sm },
  sub: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { width: "47.5%", flexGrow: 1 },
  signOut: { alignItems: "center", paddingVertical: 14, marginTop: spacing.sm },
  signOutText: { color: "#ff6b6b", fontSize: 15, fontWeight: "600" },
  tagline: { color: colors.textDim, fontSize: 13, textAlign: "center", paddingBottom: spacing.sm },
});
