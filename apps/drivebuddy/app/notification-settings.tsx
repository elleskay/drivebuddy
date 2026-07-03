import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonList } from "@/components/skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api, type NotificationSettings } from "@/lib/api";
import { accent, radius, shadow } from "@/lib/theme";

type ToggleKey = keyof Omit<NotificationSettings, "userId" | "updatedAt">;
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TYPES: { key: ToggleKey; label: string; desc: string; icon: IoniconName; tint: string }[] = [
  {
    key: "preDrive",
    label: "Pre-drive alerts",
    desc: "Reminders before you set off",
    icon: "alarm-outline",
    tint: accent.routine,
  },
  {
    key: "realTime",
    label: "Real-time alerts",
    desc: "Live warnings while driving",
    icon: "warning-outline",
    tint: accent.traffic,
  },
  {
    key: "postTrip",
    label: "Post-trip summaries",
    desc: "Cost & distance after each drive",
    icon: "receipt-outline",
    tint: accent.fuel,
  },
  {
    key: "system",
    label: "System",
    desc: "App news & account notices",
    icon: "information-circle-outline",
    tint: accent.carpark,
  },
];

const CHANNELS: { key: ToggleKey; label: string; icon: IoniconName; tint: string }[] = [
  { key: "speed", label: "Speed warnings", icon: "speedometer-outline", tint: accent.safety },
  { key: "hazard", label: "Road hazards", icon: "alert-circle-outline", tint: accent.traffic },
  { key: "erp", label: "ERP charges", icon: "card-outline", tint: accent.erp },
  { key: "traffic", label: "Traffic incidents", icon: "car-outline", tint: accent.routine },
  { key: "weather", label: "Weather", icon: "rainy-outline", tint: accent.weather },
];

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSettings(await api.getNotificationSettings());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggle = useCallback(async (key: ToggleKey, value: boolean) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    await api.updateNotificationSettings({ [key]: value }).catch(() => undefined);
  }, []);

  if (loading || !settings) {
    return (
      <View style={styles.container}>
        <SkeletonList />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.section}>Notification types</Text>
        <View style={styles.card}>
          {TYPES.map((t, i) => (
            <Row
              key={t.key}
              label={t.label}
              desc={t.desc}
              icon={t.icon}
              tint={t.tint}
              value={settings[t.key]}
              onChange={(v) => void toggle(t.key, v)}
              last={i === TYPES.length - 1}
            />
          ))}
        </View>

        <Text style={styles.section}>Real-time alert channels</Text>
        <View style={[styles.card, !settings.realTime && styles.disabled]}>
          {CHANNELS.map((c, i) => (
            <Row
              key={c.key}
              label={c.label}
              icon={c.icon}
              tint={c.tint}
              value={settings[c.key]}
              onChange={(v) => void toggle(c.key, v)}
              disabled={!settings.realTime}
              last={i === CHANNELS.length - 1}
            />
          ))}
        </View>
        {!settings.realTime ? (
          <Text style={styles.note}>Enable “Real-time alerts” to use these channels.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  desc,
  icon,
  tint,
  value,
  onChange,
  disabled,
  last,
}: {
  label: string;
  desc?: string;
  icon: IoniconName;
  tint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIconWrap, { backgroundColor: tint + "1a" }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {desc ? <Text style={styles.rowDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#e4e9f2", true: "#2563eb" }}
        thumbColor="#0f172a"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  inner: { padding: 16, gap: 8 },
  section: {
    color: "#5b6b86",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    ...shadow,
  },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomColor: "#e4e9f2", borderBottomWidth: 1 },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { color: "#0f172a", fontSize: 15, fontWeight: "600" },
  rowDesc: { color: "#5b6b86", fontSize: 12, marginTop: 2 },
  note: { color: "#94a3b8", fontSize: 12, marginLeft: 4, marginTop: 4 },
});
