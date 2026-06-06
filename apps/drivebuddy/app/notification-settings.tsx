import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SkeletonList } from "@/components/skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api, type NotificationSettings } from "@/lib/api";

type ToggleKey = keyof Omit<NotificationSettings, "userId" | "updatedAt">;

const TYPES: { key: ToggleKey; label: string; desc: string }[] = [
  { key: "preDrive", label: "Pre-drive alerts", desc: "Reminders before you set off" },
  { key: "realTime", label: "Real-time alerts", desc: "Live warnings while driving" },
  { key: "postTrip", label: "Post-trip summaries", desc: "Cost & distance after each drive" },
  { key: "system", label: "System", desc: "App news & account notices" },
];

const CHANNELS: { key: ToggleKey; label: string }[] = [
  { key: "speed", label: "Speed warnings" },
  { key: "hazard", label: "Road hazards" },
  { key: "erp", label: "ERP charges" },
  { key: "traffic", label: "Traffic incidents" },
  { key: "weather", label: "Weather" },
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

  const toggle = useCallback(
    async (key: ToggleKey, value: boolean) => {
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
      await api.updateNotificationSettings({ [key]: value }).catch(() => undefined);
    },
    [],
  );

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
              value={settings[t.key]}
              onChange={(v) => toggle(t.key, v)}
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
              value={settings[c.key]}
              onChange={(v) => toggle(c.key, v)}
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
  value,
  onChange,
  disabled,
  last,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {desc ? <Text style={styles.rowDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#243049", true: "#4f8cff" }}
        thumbColor="#e7eefc"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  inner: { padding: 16, gap: 8 },
  section: { color: "#9fb0d0", fontSize: 13, fontWeight: "700", marginTop: 12, marginBottom: 6, marginLeft: 4 },
  card: { backgroundColor: "#131c2e", borderColor: "#243049", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  rowBorder: { borderBottomColor: "#243049", borderBottomWidth: 1 },
  rowLabel: { color: "#e7eefc", fontSize: 15, fontWeight: "600" },
  rowDesc: { color: "#9fb0d0", fontSize: 12, marginTop: 2 },
  note: { color: "#5a6b8c", fontSize: 12, marginLeft: 4, marginTop: 4 },
});
