import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import type { Ionicons } from "@expo/vector-icons";
import { api, type Insights } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Hero, NavCard } from "@/components/ui";
import { accent, colors, spacing } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [insights, setInsights] = useState<Insights | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .unreadCount()
        .then(({ count }) => setUnread(count))
        .catch(() => undefined);
      api
        .insights()
        .then(setInsights)
        .catch(() => undefined);
    }, []),
  );

  const tiles: {
    title: string;
    desc: string;
    route: Href;
    icon: IoniconName;
    tint: string;
    badge?: number;
  }[] = [
    {
      title: "Recommendations",
      desc: "Insights from your drives",
      route: "/recommendations",
      icon: "bulb-outline",
      tint: accent.carpark,
    },
    {
      title: "Notifications",
      desc: "Alerts and trip summaries",
      route: "/notifications",
      icon: "notifications-outline",
      tint: accent.traffic,
      badge: unread,
    },
    {
      title: "My Vehicles",
      desc: "Manage your vehicles",
      route: "/vehicles",
      icon: "car-outline",
      tint: accent.fuel,
    },
    {
      title: "Profile",
      desc: "Your personal details",
      route: "/profile",
      icon: "person-outline",
      tint: accent.weather,
    },
    {
      title: "Settings",
      desc: "App and account",
      route: "/settings",
      icon: "settings-outline",
      tint: colors.textMuted,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Hero
          title={`Hi ${user?.fullName?.split(" ")[0] ?? "there"}`}
          subtitle="Here's your week on the road"
        >
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>{insights?.last7.trips ?? 0}</Text>
              <Text style={styles.heroLabel}>drives this week</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroNum}>${(insights?.last7.cost ?? 0).toFixed(0)}</Text>
              <Text style={styles.heroLabel}>spent this week</Text>
            </View>
          </View>
        </Hero>

        <NavCard
          title="Start a Drive"
          desc="Track your route, distance and cost"
          icon="car-sport-outline"
          onPress={() => router.push("/journey")}
          primary
        />

        <View style={styles.grid}>
          {tiles.map((t) => (
            <NavCard
              key={t.title}
              title={t.title}
              desc={t.desc}
              icon={t.icon}
              tint={t.tint}
              badge={t.badge}
              onPress={() => router.push(t.route)}
            />
          ))}
        </View>

        <Pressable style={styles.signOut} onPress={() => void signOut()}>
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
  heroStats: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  heroStat: { flex: 1 },
  heroNum: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: spacing.lg,
  },
  grid: { gap: spacing.md },
  signOut: { alignItems: "center", paddingVertical: 14, marginTop: spacing.sm },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: "600" },
  tagline: { color: colors.textDim, fontSize: 13, textAlign: "center", paddingBottom: spacing.sm },
});
