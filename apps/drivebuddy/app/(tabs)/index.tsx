import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, type Insights, type Recommendation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { REC_ICON, type IconName } from "@/lib/icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { radius, space, withAlpha, type Category } from "@/lib/theme";
import { RouteArt } from "@/components/route-art";
import {
  Avatar,
  Card,
  CountBadge,
  IconButton,
  IconWell,
  Screen,
  SectionHeader,
  Text,
} from "@/components/ui";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "+2 vs last week" style comparison of this week against the previous one. */
function delta(curr: number, prev: number, fmt: (n: number) => string) {
  const d = curr - prev;
  if (d === 0) return { icon: "remove" as const, text: "Same as last week" };
  return {
    icon: d > 0 ? ("trending-up" as const) : ("trending-down" as const),
    text: `${d > 0 ? "+" : "-"}${fmt(Math.abs(d))} vs last week`,
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
  const [unread, setUnread] = useState(0);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [tip, setTip] = useState<Recommendation | null>(null);

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
      api
        .listRecommendations()
        .then((list) => setTip(list.find((r) => !r.dismissed) ?? null))
        .catch(() => undefined);
    }, []),
  );

  const week = insights?.last7 ?? { trips: 0, cost: 0 };
  const prev = insights?.prev7 ?? { trips: 0, cost: 0 };

  const shortcuts: {
    label: string;
    icon: IconName;
    category: Category;
    route: Href;
    badge?: number;
  }[] = [
    { label: "Insights", icon: "bulb-outline", category: "carpark", route: "/recommendations" },
    { label: "Vehicles", icon: "car-outline", category: "fuel", route: "/vehicles" },
    {
      label: "Alerts",
      icon: "notifications-outline",
      category: "traffic",
      route: "/notifications",
      badge: unread,
    },
    { label: "Profile", icon: "person-outline", category: "weather", route: "/profile" },
  ];

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Account and settings"
            style={styles.who}
          >
            <Avatar name={user?.fullName} size={46} />
            <View style={styles.flex}>
              <Text variant="footnote" tone="secondary">
                {greeting()}
              </Text>
              <Text variant="title3" numberOfLines={1}>
                {user?.fullName?.split(" ")[0] ?? "there"}
              </Text>
            </View>
          </Pressable>
          <IconButton
            icon="notifications-outline"
            accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
            badge={unread}
            onPress={() => router.push("/notifications")}
          />
        </View>

        <Pressable
          onPress={() => router.push("/journey")}
          accessibilityRole="button"
          accessibilityLabel="Start a drive"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <RouteArt
            road={withAlpha(t.color.onAccent, 0.07)}
            lane={withAlpha(t.color.onAccent, 0.22)}
            dot={t.color.onAccent}
          />
          <Text variant="overline" tone="onAccent" style={styles.ctaEyebrow}>
            Journey mode
          </Text>
          <Text variant="display" tone="onAccent" style={styles.ctaTitle}>
            Start a{"\n"}drive
          </Text>
          <View style={styles.ctaFooter}>
            <Text variant="subhead" tone="onAccent" style={styles.ctaSub}>
              Live route, trip cost and spoken ERP, traffic and weather alerts.
            </Text>
            <View style={styles.ctaGo}>
              <Ionicons name="arrow-forward" size={24} color={t.color.accent} />
            </View>
          </View>
        </Pressable>

        <SectionHeader
          title="This week"
          action={{ label: "History", onPress: () => router.push("/history") }}
        />
        <View style={styles.weekRow}>
          <WeekStat
            icon="car-sport-outline"
            label={week.trips === 1 ? "drive" : "drives"}
            value={String(week.trips)}
            trend={delta(week.trips, prev.trips, String)}
          />
          <WeekStat
            icon="wallet-outline"
            label="spent"
            value={`$${week.cost.toFixed(0)}`}
            trend={delta(week.cost, prev.cost, (n) => `$${n.toFixed(0)}`)}
          />
        </View>

        {tip ? (
          <>
            <SectionHeader
              title="For you"
              action={{ label: "All insights", onPress: () => router.push("/recommendations") }}
            />
            <Card
              onPress={() => router.push("/recommendations")}
              accessibilityLabel={`Recommendation: ${tip.title}`}
              style={styles.tip}
            >
              <IconWell icon={REC_ICON[tip.category]} category={tip.category} size={44} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{tip.title}</Text>
                <Text variant="subhead" tone="secondary" numberOfLines={3}>
                  {tip.body}
                </Text>
              </View>
            </Card>
          </>
        ) : null}

        <SectionHeader title="Shortcuts" />
        <View style={styles.shortcuts}>
          {shortcuts.map((s) => (
            <Pressable
              key={s.label}
              onPress={() => router.push(s.route)}
              accessibilityRole="button"
              accessibilityLabel={s.badge ? `${s.label}, ${s.badge} unread` : s.label}
              style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
            >
              <View>
                <IconWell icon={s.icon} category={s.category} size={44} />
                {s.badge ? <CountBadge count={s.badge} style={styles.shortcutBadge} /> : null}
              </View>
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function WeekStat({
  icon,
  label,
  value,
  trend,
}: {
  icon: IconName;
  label: string;
  value: string;
  trend: { icon: IconName; text: string };
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.weekStat}>
      <Ionicons name={icon} size={20} color={t.color.textSecondary} />
      <View style={styles.weekValueRow}>
        <Text variant="display" tabular>
          {value}
        </Text>
        <Text variant="subhead" tone="secondary">
          {label}
        </Text>
      </View>
      <View style={styles.trend}>
        <Ionicons name={trend.icon} size={14} color={t.color.textTertiary} />
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {trend.text}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.xl, paddingTop: space.md, gap: space.lg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },

  topBar: { flexDirection: "row", alignItems: "center", gap: space.md },
  who: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },

  cta: {
    backgroundColor: t.color.accent,
    borderRadius: radius.xl,
    padding: space.xxl,
    paddingTop: space.xl,
    overflow: "hidden",
    minHeight: 216,
  },
  ctaEyebrow: { opacity: 0.6 },
  ctaTitle: { marginTop: space.sm },
  ctaFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.lg,
    marginTop: "auto",
    paddingTop: space.lg,
  },
  ctaSub: { flex: 1, opacity: 0.72 },
  ctaGo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.color.onAccent,
    alignItems: "center",
    justifyContent: "center",
  },

  weekRow: { flexDirection: "row", gap: space.md },
  weekStat: {
    flex: 1,
    backgroundColor: t.color.surface,
    borderColor: t.color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  weekValueRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: space.xs },
  trend: { flexDirection: "row", alignItems: "center", gap: 4 },

  tip: { flexDirection: "row", alignItems: "flex-start", gap: space.md },

  shortcuts: { flexDirection: "row", gap: space.md },
  shortcut: {
    flex: 1,
    alignItems: "center",
    gap: space.sm,
    backgroundColor: t.color.surface,
    borderColor: t.color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
  },
  shortcutBadge: { position: "absolute", top: -6, right: -8 },
}));
