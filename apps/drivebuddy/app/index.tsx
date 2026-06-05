import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.inner}>
        <Text style={styles.greeting}>Hi {user?.fullName?.split(" ")[0] ?? "there"} 👋</Text>
        <Text style={styles.sub}>Welcome to DriveBuddy</Text>

        <Pressable style={[styles.card, styles.primaryCard]} onPress={() => router.push("/journey")}>
          <Text style={styles.cardIcon}>🧭</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Start a Drive</Text>
            <Text style={styles.cardDesc}>Track your route, distance & cost</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/dashboard")}>
          <Text style={styles.cardIcon}>🌤️</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Live Info</Text>
            <Text style={styles.cardDesc}>Weather, traffic, ERP, carparks, petrol</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/history")}>
          <Text style={styles.cardIcon}>🛣️</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Trip History</Text>
            <Text style={styles.cardDesc}>Past drives & summaries</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/notifications")}>
          <Text style={styles.cardIcon}>🔔</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardDesc}>Alerts & trip summaries</Text>
          </View>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          ) : null}
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/vehicles")}>
          <Text style={styles.cardIcon}>🚗</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>My Vehicles</Text>
            <Text style={styles.cardDesc}>Add and manage your vehicles</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push("/profile")}>
          <Text style={styles.cardIcon}>👤</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardDesc}>Your personal details</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>Notifications & AI assistant coming next</Text>
        </View>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  inner: { flex: 1, padding: 20, gap: 14 },
  greeting: { color: "#e7eefc", fontSize: 26, fontWeight: "800", marginTop: 8 },
  sub: { color: "#9fb0d0", fontSize: 15, marginBottom: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  primaryCard: { borderColor: "#4f8cff", backgroundColor: "#16223a" },
  cardIcon: { fontSize: 26 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#e5484d",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  cardBody: { flex: 1 },
  cardTitle: { color: "#e7eefc", fontSize: 17, fontWeight: "700" },
  cardDesc: { color: "#9fb0d0", fontSize: 13, marginTop: 2 },
  chevron: { color: "#4f8cff", fontSize: 28, fontWeight: "300" },
  comingSoon: { marginTop: "auto", alignItems: "center" },
  comingSoonText: { color: "#5a6b8c", fontSize: 13 },
  signOut: { alignItems: "center", paddingVertical: 14 },
  signOutText: { color: "#ff6b6b", fontSize: 15, fontWeight: "600" },
});
