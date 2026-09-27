import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api, type DrivingRoute } from "@/lib/api";
import { dayLabel, driveName, formatDuration, formatTime, minutesBetween } from "@/lib/format";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import { SkeletonList } from "@/components/skeleton";
import { EmptyState, IconWell, Screen, ScreenHeader, Text } from "@/components/ui";

/** Newest first, grouped under "Today", "Yesterday", "Mon, 22 Sep"... */
function groupByDay(routes: DrivingRoute[]) {
  const sorted = [...routes].sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
  const sections: { title: string; data: DrivingRoute[] }[] = [];
  for (const r of sorted) {
    const title = dayLabel(new Date(r.startTime));
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(r);
    else sections.push({ title, data: [r] });
  }
  return sections;
}

export default function HistoryScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
  const [routes, setRoutes] = useState<DrivingRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoutes((await api.listRoutes()).filter((r) => !r.isActive));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sections = useMemo(() => groupByDay(routes), [routes]);
  const totalKm = routes.reduce((sum, r) => sum + r.totalDistance, 0);

  if (loading) {
    return (
      <Screen edges={["top"]}>
        <SkeletonList />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={t.color.accentInk}
            colors={[t.color.onAccent]}
            progressBackgroundColor={t.color.accent}
          />
        }
        ListHeaderComponent={
          <ScreenHeader
            title="History"
            subtitle={
              routes.length
                ? `${routes.length} ${routes.length === 1 ? "drive" : "drives"} · ${totalKm.toFixed(0)} km recorded`
                : "Your recorded drives"
            }
            style={styles.header}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="car-sport-outline"
            title="No drives yet"
            message="Drives you record show up here with their route, distance and cost."
            action={{
              label: "Start a drive",
              icon: "play",
              onPress: () => router.push("/journey"),
            }}
          />
        }
        renderSectionHeader={({ section }) => (
          <Text variant="overline" tone="tertiary" style={styles.sectionLabel}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => {
          const first = index === 0;
          const last = index === section.data.length - 1;
          const start = new Date(item.startTime);
          const mins = minutesBetween(item.startTime, item.endTime);
          const meta = [
            formatTime(start),
            mins != null ? formatDuration(mins) : null,
            `avg ${Math.round(item.averageSpeed)} km/h`,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <Pressable
              onPress={() => router.push(`/trip/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name || driveName(start)}, ${item.totalDistance.toFixed(1)} kilometres`}
              style={({ pressed }) => [
                styles.row,
                first && styles.rowFirst,
                last && styles.rowLast,
                !first && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <IconWell icon="navigate" category="routine" size={40} />
              <View style={styles.rowBody}>
                <Text variant="callout" numberOfLines={1}>
                  {item.name || driveName(start)}
                </Text>
                <Text variant="footnote" tone="secondary" numberOfLines={1}>
                  {meta}
                </Text>
              </View>
              <Text variant="bodyStrong" tabular>
                {item.totalDistance.toFixed(1)}
                <Text variant="footnote" tone="secondary">
                  {" "}
                  km
                </Text>
              </Text>
              <Ionicons name="chevron-forward" size={16} color={t.color.textTertiary} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  header: { paddingTop: space.md, marginBottom: space.sm },
  sectionLabel: { marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: t.color.surface,
    borderColor: t.color.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  rowDivider: { borderTopWidth: 1 },
  rowPressed: { backgroundColor: t.color.surfaceMuted },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
}));
