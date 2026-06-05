import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { api, type AppNotification, type NotificationType } from "@/lib/api";

const ICON: Record<NotificationType, string> = {
  PRE_DRIVE: "⏰",
  REAL_TIME: "⚠️",
  POST_TRIP: "🚗",
  SYSTEM: "🔔",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.listNotifications());
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

  const onTap = useCallback(
    async (n: AppNotification) => {
      if (!n.read) {
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        void api.markNotificationRead(n.id).catch(() => undefined);
      }
      const routeId = n.data && typeof n.data.routeId === "string" ? n.data.routeId : null;
      if (routeId) router.push(`/trip/${routeId}`);
    },
    [router],
  );

  const markAll = useCallback(async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await api.markAllNotificationsRead().catch(() => undefined);
  }, []);

  const sendTest = useCallback(async () => {
    await api.sendTestNotification().catch(() => undefined);
    await load();
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
      <View style={styles.toolbar}>
        <Pressable onPress={sendTest} hitSlop={8}>
          <Text style={styles.toolbarLink}>Send test</Text>
        </Pressable>
        <Pressable onPress={markAll} hitSlop={8}>
          <Text style={styles.toolbarLink}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor="#4f8cff"
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.row, !item.read && styles.unread]} onPress={() => onTap(item)}>
            <Text style={styles.icon}>{ICON[item.type]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
            {!item.read ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  toolbarLink: { color: "#4f8cff", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 10 },
  empty: { color: "#9fb0d0", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  unread: { borderColor: "#4f8cff", backgroundColor: "#16223a" },
  icon: { fontSize: 22 },
  title: { color: "#e7eefc", fontSize: 15, fontWeight: "700" },
  body: { color: "#9fb0d0", fontSize: 13, marginTop: 2 },
  time: { color: "#5a6b8c", fontSize: 11, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4f8cff" },
});
