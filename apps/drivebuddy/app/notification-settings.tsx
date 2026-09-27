import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api, type NotificationSettings } from "@/lib/api";
import type { IconName } from "@/lib/icons";
import { makeStyles } from "@/lib/theme-context";
import { space, type Category } from "@/lib/theme";
import { SkeletonList } from "@/components/skeleton";
import {
  GroupLabel,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  Text,
  Toggle,
} from "@/components/ui";

type ToggleKey = keyof Omit<NotificationSettings, "userId" | "updatedAt">;

const TYPES: { key: ToggleKey; label: string; desc: string; icon: IconName; category: Category }[] =
  [
    {
      key: "preDrive",
      label: "Pre-drive alerts",
      desc: "Reminders before you set off",
      icon: "alarm-outline",
      category: "routine",
    },
    {
      key: "realTime",
      label: "Real-time alerts",
      desc: "Live warnings while driving",
      icon: "warning-outline",
      category: "traffic",
    },
    {
      key: "postTrip",
      label: "Post-trip summaries",
      desc: "Cost and distance after each drive",
      icon: "receipt-outline",
      category: "fuel",
    },
    {
      key: "system",
      label: "System",
      desc: "App news and account notices",
      icon: "information-circle-outline",
      category: "carpark",
    },
  ];

const CHANNELS: { key: ToggleKey; label: string; icon: IconName; category: Category }[] = [
  { key: "speed", label: "Speed warnings", icon: "speedometer-outline", category: "safety" },
  { key: "hazard", label: "Road hazards", icon: "alert-circle-outline", category: "traffic" },
  { key: "erp", label: "ERP charges", icon: "card-outline", category: "erp" },
  { key: "traffic", label: "Traffic incidents", icon: "car-outline", category: "routine" },
  { key: "weather", label: "Weather", icon: "rainy-outline", category: "weather" },
];

// Separator inset: row padding (16) + icon well (34) + gap (12).
const ROW_INSET = 62;

export default function NotificationSettingsScreen() {
  const styles = useStyles();
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
      <Screen>
        <SkeletonList />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Alerts" subtitle="Choose what DriveBuddy tells you, and when" />

        <GroupLabel>Notification types</GroupLabel>
        <ListGroup inset={ROW_INSET}>
          {TYPES.map((item) => (
            <ListRow
              key={item.key}
              title={item.label}
              subtitle={item.desc}
              icon={item.icon}
              category={item.category}
              right={
                <Toggle
                  value={settings[item.key]}
                  onValueChange={(v) => void toggle(item.key, v)}
                  accessibilityLabel={item.label}
                />
              }
            />
          ))}
        </ListGroup>

        <GroupLabel>Real-time alert channels</GroupLabel>
        <View style={!settings.realTime && styles.disabled}>
          <ListGroup inset={ROW_INSET}>
            {CHANNELS.map((c) => (
              <ListRow
                key={c.key}
                title={c.label}
                icon={c.icon}
                category={c.category}
                right={
                  <Toggle
                    value={settings[c.key]}
                    onValueChange={(v) => void toggle(c.key, v)}
                    disabled={!settings.realTime}
                    accessibilityLabel={c.label}
                  />
                }
              />
            ))}
          </ListGroup>
        </View>
        {!settings.realTime ? (
          <Text variant="footnote" tone="tertiary" style={styles.note}>
            Turn on Real-time alerts to choose channels.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  content: { padding: space.xl, paddingTop: space.xs },
  disabled: { opacity: 0.5 },
  note: { marginTop: space.sm, marginLeft: space.xs },
}));
