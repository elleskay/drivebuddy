import Constants from "expo-constants";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { accent, colors, gradients, radius, shadow } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "-";
  const version = Constants.expoConfig?.version ?? "0.1.0";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.profileCard}>
          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{(user?.fullName ?? "?").charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName ?? "DriveBuddy user"}</Text>
            <Text style={styles.email}>{user?.email ?? ""}</Text>
          </View>
        </View>

        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          <Row label="Edit profile" icon="person-outline" tint={accent.weather} onPress={() => router.push("/profile")} />
          <Row label="My vehicles" icon="car-outline" tint={accent.fuel} onPress={() => router.push("/vehicles")} />
          <Row label="Notification settings" icon="notifications-outline" tint={accent.traffic} onPress={() => router.push("/notification-settings")} last />
        </View>

        <Text style={styles.section}>Activity</Text>
        <View style={styles.group}>
          <Row label="Trip history" icon="time-outline" tint={accent.routine} onPress={() => router.push("/history")} />
          <Row label="Recommendations" icon="bulb-outline" tint={accent.carpark} onPress={() => router.push("/recommendations")} last />
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

function Row({
  label,
  icon,
  tint,
  onPress,
  last,
}: {
  label: string;
  icon: IoniconName;
  tint: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <View style={[styles.rowIconWrap, { backgroundColor: tint + "1a" }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
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
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  inner: { padding: 16, gap: 8 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    ...shadow,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  name: { color: "#0f172a", fontSize: 17, fontWeight: "700" },
  email: { color: "#5b6b86", fontSize: 13, marginTop: 2 },
  section: { color: "#5b6b86", fontSize: 13, fontWeight: "700", marginTop: 14, marginLeft: 4 },
  group: { backgroundColor: "#ffffff", borderColor: "#e4e9f2", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  rowBorder: { borderBottomColor: "#e4e9f2", borderBottomWidth: 1 },
  rowIconWrap: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: "#0f172a", fontSize: 15, flex: 1 },
  infoValue: { color: "#5b6b86", fontSize: 13, maxWidth: "60%" },
  signOut: { alignItems: "center", paddingVertical: 16, marginTop: 10 },
  signOutText: { color: "#dc2626", fontSize: 15, fontWeight: "700" },
});
