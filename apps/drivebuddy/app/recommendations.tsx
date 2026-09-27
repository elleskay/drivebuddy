import { useCallback, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api, type Insights, type Recommendation } from "@/lib/api";
import { money } from "@/lib/format";
import { REC_ICON } from "@/lib/icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import { SkeletonList } from "@/components/skeleton";
import {
  Card,
  EmptyState,
  IconButton,
  IconWell,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stat,
  Text,
} from "@/components/ui";

const CATEGORY_LABEL: Record<Recommendation["category"], string> = {
  erp: "ERP",
  fuel: "Fuel",
  routine: "Routine",
  safety: "Safety",
  carpark: "Parking",
};

export default function RecommendationsScreen() {
  const t = useTheme();
  const styles = useStyles();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (recompute = false) => {
    try {
      const [ins, list] = await Promise.all([
        api.insights(),
        recompute ? api.refreshRecommendations() : api.listRecommendations(),
      ]);
      setInsights(ins);
      setRecs(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const dismiss = useCallback(async (id: string) => {
    setRecs((prev) => prev.filter((r) => r.id !== id));
    await api.dismissRecommendation(id).catch(() => undefined);
  }, []);

  if (loading) {
    return (
      <Screen>
        <SkeletonList />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={recs}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={t.color.accentInk}
            colors={[t.color.onAccent]}
            progressBackgroundColor={t.color.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Insights" subtitle="Patterns and tips from your drives" />
            {insights ? <InsightsSummary insights={insights} /> : null}
            <SectionHeader title="Recommendations" />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="bulb-outline"
            title="No tips yet"
            message="Record a few drives and pull down to refresh. Tips appear as DriveBuddy learns your patterns."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.rec}>
            <IconWell icon={REC_ICON[item.category]} category={item.category} size={42} />
            <View style={styles.recBody}>
              <Text variant="overline" style={{ color: t.category[item.category] }}>
                {CATEGORY_LABEL[item.category]}
              </Text>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="subhead" tone="secondary">
                {item.body}
              </Text>
            </View>
            <IconButton
              icon="close"
              variant="plain"
              size={32}
              color={t.color.textTertiary}
              accessibilityLabel={`Dismiss ${item.title}`}
              onPress={() => void dismiss(item.id)}
            />
          </Card>
        )}
      />
    </Screen>
  );
}

function InsightsSummary({ insights: i }: { insights: Insights }) {
  const styles = useStyles();
  return (
    <>
      <Card variant="accent" style={styles.hero}>
        <Text variant="overline" tone="onAccent" style={styles.heroLabel}>
          Total spent on the road
        </Text>
        <Text variant="display" tone="onAccent" tabular>
          {money(i.totalCost, 0)}
        </Text>
        <Text variant="subhead" tone="onAccent" style={styles.heroLabel}>
          across {i.totalTrips} {i.totalTrips === 1 ? "trip" : "trips"} ·{" "}
          {Math.round(i.totalDistanceKm).toLocaleString()} km
        </Text>
      </Card>
      <View style={styles.grid}>
        <Stat
          label="Avg per trip"
          value={money(i.avgCostPerTrip)}
          icon="wallet-outline"
          category="fuel"
        />
        <Stat
          label="Avg distance"
          value={i.avgDistanceKm.toFixed(1)}
          unit="km"
          icon="navigate-outline"
          category="routine"
        />
      </View>
      <View style={styles.grid}>
        <Stat
          label="Busiest day"
          value={i.busiestDay ?? "-"}
          icon="calendar-outline"
          category="carpark"
        />
        <Stat
          label="Peak hour"
          value={i.peakHour != null ? formatHour(i.peakHour) : "-"}
          icon="time-outline"
          category="traffic"
        />
      </View>
    </>
  );
}

function formatHour(h: number): string {
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${am ? "am" : "pm"}`;
}

const useStyles = makeStyles(() => ({
  content: { padding: space.xl, paddingTop: space.xs, gap: space.md },
  header: { gap: space.md, marginBottom: space.xs },
  hero: { gap: space.xs, paddingVertical: space.xl },
  heroLabel: { opacity: 0.7 },
  grid: { flexDirection: "row", gap: space.md },
  rec: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  recBody: { flex: 1, minWidth: 0, gap: 3 },
}));
