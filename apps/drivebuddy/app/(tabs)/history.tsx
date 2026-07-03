import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonList } from "@/components/skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { accent, radius, shadow } from "@/lib/theme";
import { api, type DrivingRoute } from "@/lib/api";

export default function HistoryScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<DrivingRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const onExport = useCallback(async (r: DrivingRoute) => {
    try {
      setBusyId(r.id);
      const gpx = await api.exportRouteGpx(r.id);
      // Core React Native Share sheet (no extra native module needed).
      await Share.share({ title: `${r.name || "DriveBuddy route"}.gpx`, message: gpx });
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }, []);

  const onDelete = useCallback((r: DrivingRoute) => {
    const doDelete = async () => {
      try {
        setBusyId(r.id);
        await api.deleteRoute(r.id);
        setRoutes((prev) => prev.filter((x) => x.id !== r.id));
      } catch (e) {
        Alert.alert("Delete failed", e instanceof Error ? e.message : "Please try again.");
      } finally {
        setBusyId(null);
      }
    };
    Alert.alert("Delete drive?", "This permanently removes the route, its GPS trace and summary.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void doDelete() },
    ]);
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
        data={routes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No drives yet. Start one from Journey Mode.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable style={styles.info} onPress={() => router.push(`/trip/${item.id}`)}>
              <View style={styles.routeIcon}>
                <Ionicons name="navigate" size={18} color={accent.routine} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name || formatDate(item.startTime)}</Text>
                <Text style={styles.meta}>
                  {item.totalDistance.toFixed(1)} km · avg {Math.round(item.averageSpeed)} km/h
                </Text>
              </View>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                disabled={busyId === item.id}
                onPress={() => void onExport(item)}
              >
                <Text style={styles.actionText}>Export</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.deleteBtn]}
                disabled={busyId === item.id}
                onPress={() => onDelete(item)}
              >
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  list: { padding: 16, gap: 10 },
  empty: { color: "#5b6b86", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    ...shadow,
  },
  info: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  routeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: accent.routine + "1a",
  },
  title: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  meta: { color: "#5b6b86", fontSize: 13, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, marginLeft: 8 },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#e6ebf3",
  },
  actionText: { color: "#5b6b86", fontSize: 12, fontWeight: "700" },
  deleteBtn: { backgroundColor: "#fee2e2" },
  deleteText: { color: "#dc2626" },
});
