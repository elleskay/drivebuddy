import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { api, type DrivingRoute } from "@/lib/api";

export default function HistoryScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<DrivingRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRoutes((await api.listRoutes()).filter((r) => !r.isActive));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    void load();
  }, [load]);

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
        data={routes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No drives yet. Start one from Journey Mode.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/trip/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.name || formatDate(item.startTime)}</Text>
              <Text style={styles.meta}>
                {item.totalDistance.toFixed(1)} km · avg {Math.round(item.averageSpeed)} km/h
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 10 },
  empty: { color: "#9fb0d0", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  title: { color: "#e7eefc", fontSize: 16, fontWeight: "700" },
  meta: { color: "#9fb0d0", fontSize: 13, marginTop: 3 },
  chevron: { color: "#4f8cff", fontSize: 26, fontWeight: "300" },
});
