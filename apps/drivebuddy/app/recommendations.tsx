import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api, type Insights, type Recommendation } from "@/lib/api";

const ICON: Record<Recommendation["category"], string> = {
  erp: "💳",
  fuel: "⛽",
  routine: "🔁",
  safety: "🛡️",
  carpark: "🅿️",
};

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
      <View style={styles.center}>
        <ActivityIndicator color="#4f8cff" size="large" />
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
            tintColor="#4f8cff"
          />
        }
        ListHeaderComponent={insights ? <InsightsHeader insights={insights} /> : null}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No recommendations yet. Record a few drives and pull to refresh — tips appear as DriveBuddy learns your patterns.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardIcon}>{ICON[item.category]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
            <Pressable onPress={() => dismiss(item.id)} hitSlop={10}>
              <Text style={styles.dismiss}>✕</Text>
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
        <Stat value={i.busiestDay ?? "—"} label="Busiest day" />
        <Stat value={i.peakHour != null ? formatHour(i.peakHour) : "—"} label="Peak hour" />
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
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 10 },
  headerWrap: { gap: 10, marginBottom: 4 },
  section: { color: "#9fb0d0", fontSize: 13, fontWeight: "700", marginTop: 6, marginLeft: 4 },
  statsGrid: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: { color: "#e7eefc", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#9fb0d0", fontSize: 11, marginTop: 3 },
  empty: { color: "#9fb0d0", textAlign: "center", marginTop: 16, paddingHorizontal: 12, lineHeight: 20 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  cardIcon: { fontSize: 22 },
  cardTitle: { color: "#e7eefc", fontSize: 15, fontWeight: "700" },
  cardBody: { color: "#9fb0d0", fontSize: 13, marginTop: 3, lineHeight: 19 },
  dismiss: { color: "#5a6b8c", fontSize: 18, fontWeight: "700" },
});
