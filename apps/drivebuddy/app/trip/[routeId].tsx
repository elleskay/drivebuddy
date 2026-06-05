import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Svg, { Circle, Polyline } from "react-native-svg";
import { api, type RouteDetail, type TripSummary } from "@/lib/api";

export default function TripScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, t] = await Promise.all([
          api.getRoute(routeId),
          api.getTrip(routeId).catch(() => null),
        ]);
        setRoute(r);
        setTrip(t);
      } finally {
        setLoading(false);
      }
    })();
  }, [routeId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f8cff" size="large" />
      </View>
    );
  }

  const fuel = trip ? parseFloat(trip.fuelCost) : 0;
  const erp = trip ? parseFloat(trip.erpCost) : 0;
  const parking = trip ? parseFloat(trip.parkingCost) : 0;
  const total = fuel + erp + parking;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <RoutePath points={route?.points ?? []} />

        <View style={styles.statsRow}>
          <Stat value={(route?.totalDistance ?? 0).toFixed(2)} unit="km" label="Distance" />
          <Stat value={String(trip?.durationMin ?? 0)} unit="min" label="Duration" />
          <Stat value={Math.round(route?.averageSpeed ?? 0).toString()} unit="km/h" label="Avg speed" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip cost</Text>
          <CostRow label="⛽ Fuel" value={fuel} />
          <CostRow label="💳 ERP" value={erp} />
          <CostRow label="🅿️ Parking" value={parking} />
          <View style={styles.divider} />
          <CostRow label="Total" value={total} bold />
        </View>
        {trip ? null : <Text style={styles.note}>Summary still generating…</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function RoutePath({ points }: { points: { latitude: number; longitude: number }[] }) {
  const W = 320;
  const H = 200;
  const pad = 16;
  if (points.length < 2) {
    return (
      <View style={[styles.map, { height: H, justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.muted}>Not enough GPS points to draw the route.</Text>
      </View>
    );
  }
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;
  const scale = Math.min((W - pad * 2) / spanLng, (H - pad * 2) / spanLat);
  const project = (p: { latitude: number; longitude: number }) => ({
    x: pad + (p.longitude - minLng) * scale,
    y: H - pad - (p.latitude - minLat) * scale, // invert y (north up)
  });
  const pts = points.map(project);
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const start = pts[0]!;
  const end = pts[pts.length - 1]!;

  return (
    <View style={[styles.map, { height: H }]}>
      <Svg width={W} height={H}>
        <Polyline points={polyline} fill="none" stroke="#4f8cff" strokeWidth={3} strokeLinejoin="round" />
        <Circle cx={start.x} cy={start.y} r={5} fill="#7ee0a2" />
        <Circle cx={end.x} cy={end.y} r={5} fill="#e5484d" />
      </Svg>
    </View>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function CostRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.costRow}>
      <Text style={[styles.costLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.costValue, bold && styles.bold]}>${value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  inner: { padding: 16, gap: 14 },
  map: {
    backgroundColor: "#101a2c",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
  },
  muted: { color: "#5a6b8c", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 10 },
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
  statUnit: { color: "#9fb0d0", fontSize: 11, fontWeight: "600" },
  statLabel: { color: "#9fb0d0", fontSize: 11, marginTop: 3 },
  card: {
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardTitle: { color: "#e7eefc", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  costRow: { flexDirection: "row", justifyContent: "space-between" },
  costLabel: { color: "#9fb0d0", fontSize: 15 },
  costValue: { color: "#e7eefc", fontSize: 15, fontWeight: "600" },
  bold: { color: "#e7eefc", fontWeight: "800", fontSize: 16 },
  divider: { height: 1, backgroundColor: "#243049", marginVertical: 4 },
  note: { color: "#5a6b8c", fontSize: 12, textAlign: "center" },
});
