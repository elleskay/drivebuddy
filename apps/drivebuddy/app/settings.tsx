import Constants from "expo-constants";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "—";
  const version = Constants.expoConfig?.version ?? "0.1.0";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.fullName ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName ?? "DriveBuddy user"}</Text>
            <Text style={styles.email}>{user?.email ?? ""}</Text>
          </View>
        </View>

        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          <Row label="Edit profile" icon="👤" onPress={() => router.push("/profile")} />
          <Row label="My vehicles" icon="🚗" onPress={() => router.push("/vehicles")} />
          <Row label="Notification settings" icon="🔔" onPress={() => router.push("/notification-settings")} last />
        </View>

        <Text style={styles.section}>Activity</Text>
        <View style={styles.group}>
          <Row label="Trip history" icon="🛣️" onPress={() => router.push("/history")} />
          <Row label="Recommendations" icon="💡" onPress={() => router.push("/recommendations")} last />
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.group}>
          <InfoRow label="Version" value={version} />
          <InfoRow label="Region" value="Singapore (ap-southeast-1)" />
          <InfoRow label="API" value={apiUrl.replace(/^https?:\/\//, "")} last />
        </View>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, icon, onPress, last }: { label: string; icon: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  inner: { padding: 16, gap: 8 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#4f8cff", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  name: { color: "#e7eefc", fontSize: 17, fontWeight: "700" },
  email: { color: "#9fb0d0", fontSize: 13, marginTop: 2 },
  section: { color: "#9fb0d0", fontSize: 13, fontWeight: "700", marginTop: 14, marginLeft: 4 },
  group: { backgroundColor: "#131c2e", borderColor: "#243049", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomColor: "#243049", borderBottomWidth: 1 },
  rowIcon: { fontSize: 18 },
  rowLabel: { color: "#e7eefc", fontSize: 15, flex: 1 },
  infoValue: { color: "#9fb0d0", fontSize: 13, maxWidth: "60%" },
  chevron: { color: "#4f8cff", fontSize: 22, fontWeight: "300" },
  signOut: { alignItems: "center", paddingVertical: 16, marginTop: 10 },
  signOutText: { color: "#ff6b6b", fontSize: 15, fontWeight: "700" },
});
