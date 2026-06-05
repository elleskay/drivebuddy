import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  api,
  type CarparkItem,
  type ErpItem,
  type Feed,
  type PetrolItem,
  type TrafficItem,
  type WeatherItem,
} from "@/lib/api";

interface Data {
  weather: Feed<WeatherItem[]>;
  petrol: Feed<PetrolItem[]>;
  traffic: Feed<TrafficItem[]>;
  carpark: Feed<CarparkItem[]>;
  erp: Feed<ErpItem[]>;
}

export default function DashboardScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [weather, petrol, traffic, carpark, erp] = await Promise.all([
      api.weather(),
      api.petrol(),
      api.traffic(),
      api.carpark(),
      api.erp(),
    ]);
    setData({ weather, petrol, traffic, carpark, erp });
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
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
      <ScrollView
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f8cff" />}
      >
        <Card title="🌤  Weather" subtitle="Next 2 hours · data.gov.sg">
          {data?.weather.data.slice(0, 6).map((w) => (
            <Row key={w.area} left={w.area} right={w.forecast} />
          )) ?? null}
          {!data?.weather.data.length ? <Muted>No data</Muted> : null}
        </Card>

        <Card title="⛽  Petrol (95)" subtitle="Indicative prices">
          {data?.petrol.data.map((p) => (
            <Row key={p.brand} left={`${p.brand} ${p.product}`} right={`$${p.price.toFixed(2)}`} />
          ))}
        </Card>

        <Card title="🚧  Traffic incidents" subtitle="LTA DataMall">
          {data?.traffic.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable live traffic.</Muted>
          ) : data?.traffic.data.length ? (
            data.traffic.data.slice(0, 6).map((t, i) => <Row key={i} left={t.type} right={t.message} />)
          ) : (
            <Muted>No current incidents.</Muted>
          )}
        </Card>

        <Card title="🅿️  Carpark availability" subtitle="LTA DataMall">
          {data?.carpark.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable carpark data.</Muted>
          ) : data?.carpark.data.length ? (
            data.carpark.data.slice(0, 6).map((c) => (
              <Row key={c.id} left={c.development || c.area} right={`${c.availableLots} lots`} />
            ))
          ) : (
            <Muted>No data.</Muted>
          )}
        </Card>

        <Card title="💳  ERP rates" subtitle="LTA DataMall">
          {data?.erp.keyRequired ? (
            <Muted>Add an LTA DataMall key to enable ERP rates.</Muted>
          ) : data?.erp.data.length ? (
            data.erp.data.slice(0, 6).map((e, i) => (
              <Row key={i} left={`${e.zone} (${e.startTime}-${e.endTime})`} right={`$${e.chargeAmount.toFixed(2)}`} />
            ))
          ) : (
            <Muted>No active charges now.</Muted>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{subtitle}</Text>
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
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  inner: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: { color: "#e7eefc", fontSize: 17, fontWeight: "800" },
  cardSub: { color: "#5a6b8c", fontSize: 12, marginTop: 2, marginBottom: 8 },
  cardBody: { gap: 6 },
  rowItem: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLeft: { color: "#9fb0d0", fontSize: 14, flexShrink: 1 },
  rowRight: { color: "#e7eefc", fontSize: 14, fontWeight: "600", textAlign: "right", flexShrink: 1 },
  muted: { color: "#5a6b8c", fontSize: 13, fontStyle: "italic" },
});
