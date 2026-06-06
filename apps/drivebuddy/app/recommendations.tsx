import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SkeletonList } from "@/components/skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api, type Insights, type Recommendation } from "@/lib/api";

export default function RecommendationsScreen() {
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
      <View style={styles.container}>
        <SkeletonList />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={recs}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor="#2563eb"
          />
        }
        ListHeaderComponent={insights ? <InsightsHeader insights={insights} /> : null}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No recommendations yet. Record a few drives and pull to refresh. Tips appear as DriveBuddy learns your patterns.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
            <Pressable onPress={() => dismiss(item.id)} hitSlop={10}>
              <Text style={styles.dismiss}>X</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function InsightsHeader({ insights: i }: { insights: Insights }) {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.section}>Your driving</Text>
      <View style={styles.statsGrid}>
        <Stat value={String(i.totalTrips)} label="Trips" />
        <Stat value={i.totalDistanceKm.toFixed(0)} label="km total" />
        <Stat value={`$${i.totalCost.toFixed(0)}`} label="Spent" />
      </View>
      <View style={styles.statsGrid}>
        <Stat value={`$${i.avgCostPerTrip.toFixed(2)}`} label="Avg / trip" />
        <Stat value={i.busiestDay ?? "-"} label="Busiest day" />
        <Stat value={i.peakHour != null ? formatHour(i.peakHour) : "-"} label="Peak hour" />
      </View>
      <Text style={styles.section}>Recommendations</Text>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatHour(h: number): string {
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${am ? "am" : "pm"}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, backgroundColor: "#f5f7fb", justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 10 },
  headerWrap: { gap: 10, marginBottom: 4 },
  section: { color: "#5b6b86", fontSize: 13, fontWeight: "700", marginTop: 6, marginLeft: 4 },
  statsGrid: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#5b6b86", fontSize: 11, marginTop: 3 },
  empty: { color: "#5b6b86", textAlign: "center", marginTop: 16, paddingHorizontal: 12, lineHeight: 20 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  cardIcon: { fontSize: 22 },
  cardTitle: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  cardBody: { color: "#5b6b86", fontSize: 13, marginTop: 3, lineHeight: 19 },
  dismiss: { color: "#94a3b8", fontSize: 18, fontWeight: "700" },
});
