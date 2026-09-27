import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, type AppNotification } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { NOTIF_CATEGORY, NOTIF_ICON } from "@/lib/icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import { SkeletonList } from "@/components/skeleton";
import { Button, EmptyState, IconWell, Screen, ScreenHeader, Text } from "@/components/ui";

export default function NotificationsScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
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
    (n: AppNotification) => {
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
      <Screen>
        <SkeletonList />
      </Screen>
    );
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.header}>
            <ScreenHeader
              title="Notifications"
              subtitle={unread ? `${unread} unread` : "You're all caught up"}
            />
            <View style={styles.actions}>
              <Button
                label="Mark all read"
                icon="checkmark-done-outline"
                variant="secondary"
                size="sm"
                onPress={() => void markAll()}
                disabled={!unread}
              />
              <Button
                label="Send test"
                icon="paper-plane-outline"
                variant="secondary"
                size="sm"
                onPress={() => void sendTest()}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            message="Trip summaries, pre-drive reminders and live alerts will show up here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onTap(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? "" : "Unread. "}${item.title}. ${item.body}`}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <IconWell icon={NOTIF_ICON[item.type]} category={NOTIF_CATEGORY[item.type]} size={42} />
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text
                  variant={item.read ? "callout" : "bodyStrong"}
                  numberOfLines={2}
                  style={styles.title}
                >
                  {item.title}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {relativeTime(item.createdAt)}
                </Text>
              </View>
              <Text variant="subhead" tone="secondary">
                {item.body}
              </Text>
            </View>
            {!item.read ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: space.xl, paddingTop: space.xs, gap: space.sm },
  header: { gap: space.lg, marginBottom: space.sm },
  actions: { flexDirection: "row", gap: space.sm },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    backgroundColor: t.color.surface,
    borderColor: t.color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  itemPressed: { backgroundColor: t.color.surfaceMuted },
  body: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  title: { flex: 1, minWidth: 0 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: t.color.accentInk,
    marginTop: 6,
  },
}));
