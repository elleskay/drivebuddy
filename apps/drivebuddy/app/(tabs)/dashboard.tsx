import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonList } from "@/components/skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { accent, radius, shadow, spacing } from "@/lib/theme";
import {
  api,
  type CarparkItem,
  type ErpItem,
  type Feed,
  type PetrolItem,
  type TrafficItem,
  type WeatherItem,
} from "@/lib/api";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface Data {
  weather: Feed<WeatherItem[]>;
  petrol: Feed<PetrolItem[]>;
  traffic: Feed<TrafficItem[]>;
  carpark: Feed<CarparkItem[]>;
  erp: Feed<ErpItem[]>;
}

const REFRESH_OPTIONS: { label: string; ms: number }[] = [
  { label: "Off", ms: 0 },
  { label: "30s", ms: 30_000 },
  { label: "1m", ms: 60_000 },
  { label: "2m", ms: 120_000 },
];

export default function DashboardScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [intervalMs, setIntervalMs] = useState(60_000); // configurable auto-refresh
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const [weather, petrol, traffic, carpark, erp] = await Promise.all([
      api.weather(),
      api.petrol(),
      api.traffic(),
      api.carpark(),
      api.erp(),
    ]);
    setData({ weather, petrol, traffic, carpark, erp });
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    load()
      .finally(() => setLoading(false))
      .catch(() => undefined);
  }, [load]);

  // Auto-refresh at the chosen cadence (silent; pull-to-refresh still available).
  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => {
      load().catch(() => undefined);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load()
      .finally(() => setRefreshing(false))
      .catch(() => undefined);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonList />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.inner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      >
        <View style={styles.refreshBar}>
          <Text style={styles.refreshLabel}>
            Auto-refresh
            {lastUpdated
              ? ` · updated ${lastUpdated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </Text>
          <View style={styles.chips}>
            {REFRESH_OPTIONS.map((o) => (
              <Pressable
                key={o.label}
                onPress={() => setIntervalMs(o.ms)}
                style={[styles.chip, intervalMs === o.ms && styles.chipActive]}
              >
                <Text style={[styles.chipText, intervalMs === o.ms && styles.chipTextActive]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Card
          title="Weather"
          subtitle="Next 2 hours · data.gov.sg"
          icon="partly-sunny-outline"
          tint={accent.weather}
        >
          {data?.weather.data
            .slice(0, 6)
            .map((w) => <Row key={w.area} left={w.area} right={w.forecast} />) ?? null}
          {!data?.weather.data.length ? <Muted>No data</Muted> : null}
        </Card>

        <Card
          title="Petrol (95)"
          subtitle="Indicative prices"
          icon="water-outline"
          tint={accent.fuel}
        >
          {data?.petrol.data.map((p) => (
            <Row key={p.brand} left={`${p.brand} ${p.product}`} right={`$${p.price.toFixed(2)}`} />
          ))}
        </Card>

        <Card
          title="Traffic incidents"
          subtitle="LTA DataMall"
          icon="warning-outline"
          tint={accent.traffic}
        >
          {data?.traffic.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable live traffic.</Muted>
          ) : data?.traffic.data.length ? (
            data.traffic.data
              .slice(0, 6)
              .map((t, i) => <Row key={i} left={t.type} right={t.message} />)
          ) : (
            <Muted>No current incidents.</Muted>
          )}
        </Card>

        <Card
          title="Carpark availability"
          subtitle="LTA DataMall"
          icon="business-outline"
          tint={accent.carpark}
        >
          {data?.carpark.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable carpark data.</Muted>
          ) : data?.carpark.data.length ? (
            data.carpark.data
              .slice(0, 6)
              .map((c) => (
                <Row key={c.id} left={c.development || c.area} right={`${c.availableLots} lots`} />
              ))
          ) : (
            <Muted>No data.</Muted>
          )}
        </Card>

        <Card title="ERP rates" subtitle="LTA DataMall" icon="card-outline" tint={accent.erp}>
          {data?.erp.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable ERP rates.</Muted>
          ) : data?.erp.data.length ? (
            data.erp.data
              .slice(0, 6)
              .map((e, i) => (
                <Row
                  key={i}
                  left={`${e.zone} (${e.startTime}-${e.endTime})`}
                  right={`$${e.chargeAmount.toFixed(2)}`}
                />
              ))
          ) : (
            <Muted>No active charges now.</Muted>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({
  title,
  subtitle,
  icon,
  tint,
  children,
}: {
  title: string;
  subtitle: string;
  icon: IoniconName;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, { backgroundColor: tint + "1a" }]}>
          <Ionicons name={icon} size={20} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}
function Row({ left, right }: { left: string; right: string }) {
  return (
    <View style={styles.rowItem}>
      <Text style={styles.rowLeft} numberOfLines={1}>
        {left}
      </Text>
      <Text style={styles.rowRight} numberOfLines={2}>
        {right}
      </Text>
    </View>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  inner: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    ...shadow,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: 10 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "800" },
  cardSub: { color: "#94a3b8", fontSize: 12, marginTop: 1 },
  cardBody: { gap: 6 },
  rowItem: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLeft: { color: "#5b6b86", fontSize: 14, flexShrink: 1 },
  rowRight: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  muted: { color: "#94a3b8", fontSize: 13, fontStyle: "italic" },
  refreshBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  refreshLabel: { color: "#94a3b8", fontSize: 12, flexShrink: 1 },
  chips: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e4e9f2",
    backgroundColor: "#ffffff",
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#5b6b86", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
});
