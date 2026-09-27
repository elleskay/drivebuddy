import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  api,
  type CarparkItem,
  type ErpItem,
  type Feed,
  type PetrolItem,
  type TrafficItem,
  type WeatherItem,
} from "@/lib/api";
import { weatherVisual, type IconName } from "@/lib/icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { radius, space, type Category } from "@/lib/theme";
import { SkeletonList } from "@/components/skeleton";
import {
  Card,
  IconWell,
  Pill,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  webBreak,
} from "@/components/ui";

interface Data {
  weather: Feed<WeatherItem[]>;
  petrol: Feed<PetrolItem[]>;
  traffic: Feed<TrafficItem[]>;
  carpark: Feed<CarparkItem[]>;
  erp: Feed<ErpItem[]>;
}

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
  { label: "2m", value: 120_000 },
] as const;

export default function DashboardScreen() {
  const t = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [intervalMs, setIntervalMs] = useState<number>(60_000); // configurable auto-refresh
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
      <Screen edges={["top"]}>
        <SkeletonList />
      </Screen>
    );
  }

  const weather = data?.weather.data ?? [];
  const petrol = [...(data?.petrol.data ?? [])].sort((a, b) => a.price - b.price);
  const traffic = data?.traffic.data ?? [];
  const carparks = data?.carpark.data ?? [];
  const erp = data?.erp.data ?? [];

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.color.accentInk}
            colors={[t.color.onAccent]}
            progressBackgroundColor={t.color.accent}
          />
        }
      >
        <ScreenHeader
          title="Live"
          subtitle="Singapore road conditions right now"
          right={
            lastUpdated ? (
              <View style={styles.live}>
                <View style={styles.liveDot} />
                <Text variant="caption" tone="secondary" tabular>
                  {lastUpdated.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ) : null
          }
        />

        <View style={styles.refreshRow}>
          <Text variant="subheadStrong" tone="secondary">
            Auto-refresh
          </Text>
          <Segmented
            options={REFRESH_OPTIONS}
            value={intervalMs}
            onChange={setIntervalMs}
            style={styles.segment}
          />
        </View>

        <FeedCard
          title="Weather"
          caption="Next 2 hours · NEA"
          icon="partly-sunny-outline"
          category="weather"
        >
          {weather.length ? (
            <View style={styles.weatherGrid}>
              {weather.slice(0, 6).map((w) => {
                const v = weatherVisual(w.forecast);
                return (
                  <View key={w.area} style={styles.weatherTile}>
                    <Ionicons name={v.icon} size={22} color={t.category[v.category]} />
                    <Text variant="subheadStrong" numberOfLines={1}>
                      {w.area}
                    </Text>
                    <Text variant="caption" tone="secondary" numberOfLines={2}>
                      {w.forecast}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Muted>No forecast available.</Muted>
          )}
        </FeedCard>

        <FeedCard
          title="Petrol prices"
          caption="95 octane · per litre"
          icon="water-outline"
          category="fuel"
        >
          {petrol.length ? (
            petrol.map((p, i) => (
              <FeedRow
                key={p.brand}
                divider={i > 0}
                title={p.brand}
                subtitle={p.product}
                value={`$${p.price.toFixed(2)}`}
                badge={i === 0 && petrol.length > 1 ? "Cheapest" : undefined}
              />
            ))
          ) : (
            <Muted>No prices available.</Muted>
          )}
        </FeedCard>

        <FeedCard
          title="Traffic incidents"
          caption="LTA DataMall"
          icon="warning-outline"
          category="traffic"
          count={data?.traffic.keyRequired ? undefined : traffic.length}
        >
          {data?.traffic.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable live traffic.</Muted>
          ) : traffic.length ? (
            traffic.slice(0, 6).map((item, i) => (
              <View key={i} style={[styles.incident, i > 0 && styles.divider]}>
                <Pill label={item.type} tone="warning" />
                <Text variant="subhead" style={webBreak}>
                  {item.message}
                </Text>
              </View>
            ))
          ) : (
            <Muted>No incidents reported. Clear roads.</Muted>
          )}
        </FeedCard>

        <FeedCard
          title="Carparks"
          caption="Available lots · LTA DataMall"
          icon="business-outline"
          category="carpark"
        >
          {data?.carpark.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable carpark data.</Muted>
          ) : carparks.length ? (
            carparks
              .slice(0, 6)
              .map((c, i) => (
                <FeedRow
                  key={c.id}
                  divider={i > 0}
                  title={c.development || c.area}
                  value={String(c.availableLots)}
                  dot={
                    c.availableLots < 20
                      ? t.color.danger
                      : c.availableLots < 60
                        ? t.color.warning
                        : t.color.success
                  }
                />
              ))
          ) : (
            <Muted>No carpark data.</Muted>
          )}
        </FeedCard>

        <FeedCard title="ERP rates" caption="LTA DataMall" icon="card-outline" category="erp">
          {data?.erp.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable ERP rates.</Muted>
          ) : erp.length ? (
            erp
              .slice(0, 6)
              .map((e, i) => (
                <FeedRow
                  key={i}
                  divider={i > 0}
                  title={e.zone}
                  subtitle={`${e.startTime} to ${e.endTime}`}
                  value={`$${e.chargeAmount.toFixed(2)}`}
                />
              ))
          ) : (
            <Muted>No active charges right now.</Muted>
          )}
        </FeedCard>
      </ScrollView>
    </Screen>
  );
}

function FeedCard({
  title,
  caption,
  icon,
  category,
  count,
  children,
}: {
  title: string;
  caption: string;
  icon: IconName;
  category: Category;
  count?: number;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Card>
      <View style={styles.cardHead}>
        <IconWell icon={icon} category={category} size={38} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="caption" tone="tertiary">
            {caption}
          </Text>
        </View>
        {count ? <Pill label={String(count)} tone="warning" /> : null}
      </View>
      <View>{children}</View>
    </Card>
  );
}

function FeedRow({
  title,
  subtitle,
  value,
  badge,
  dot,
  divider,
}: {
  title: string;
  subtitle?: string;
  value: string;
  badge?: string;
  dot?: string;
  divider?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.flex}>
        <Text variant="callout" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? <Pill label={badge} tone="accent" style={styles.badge} /> : null}
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <Text variant="bodyStrong" tabular>
        {value}
      </Text>
    </View>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <Text variant="subhead" tone="tertiary">
      {children}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.xl, paddingTop: space.md, gap: space.lg },

  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: t.color.surface,
    borderColor: t.color.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.color.success },
  refreshRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  segment: { flex: 1 },

  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.md,
  },

  weatherGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  weatherTile: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: t.color.surfaceMuted,
    borderRadius: radius.md,
    padding: space.md,
    gap: 2,
  },

  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: t.color.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { alignSelf: "center" },
  incident: { gap: 6, paddingVertical: space.md },
}));
