import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Skeleton } from "@/components/skeleton";
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
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.inner}>
          <Skeleton width="100%" height={220} radius={14} />
          <View style={styles.statsRow}>
            <Skeleton width="32%" height={64} radius={12} />
            <Skeleton width="32%" height={64} radius={12} />
            <Skeleton width="32%" height={64} radius={12} />
          </View>
          <Skeleton width="100%" height={150} radius={14} />
        </View>
      </SafeAreaView>
    );
  }

  const fuel = trip ? parseFloat(trip.fuelCost) : 0;
  const erp = trip ? parseFloat(trip.erpCost) : 0;
  const parking = trip ? parseFloat(trip.parkingCost) : 0;
  const total = fuel + erp + parking;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <RouteMap points={route?.points ?? []} />

        <View style={styles.statsRow}>
          <Stat value={(route?.totalDistance ?? 0).toFixed(2)} unit="km" label="Distance" />
          <Stat value={String(trip?.durationMin ?? 0)} unit="min" label="Duration" />
          <Stat value={Math.round(route?.averageSpeed ?? 0).toString()} unit="km/h" label="Avg speed" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip cost</Text>
          <CostRow label="Fuel" value={fuel} />
          <CostRow label="ERP" value={erp} />
          <CostRow label="Parking" value={parking} />
          <View style={styles.divider} />
          <CostRow label="Total" value={total} bold />
        </View>
        {trip ? null : <Text style={styles.note}>Summary still generating…</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

// Web Mercator helpers (256px tiles).
const TILE = 256;
const worldX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const worldY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

/**
 * A real OpenStreetMap map built from raster tiles rendered as native <Image>s
 * (no Google key, no WebView, no native map module), with the GPS route drawn
 * over it as an SVG overlay. Picks the zoom that fits the route, lays out the
 * covering tiles, and projects the points into the same pixel space.
 */
function RouteMap({ points }: { points: { latitude: number; longitude: number }[] }) {
  const W = 340;
  const H = 220;
  if (points.length < 2) {
    return (
      <View style={[styles.map, { width: W, height: H, justifyContent: "center", alignItems: "center" }]}>
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

  // Largest zoom where the route bbox fits inside the viewport (with padding).
  let z = 17;
  for (; z > 2; z--) {
    const dx = worldX(maxLng, z) - worldX(minLng, z);
    const dy = worldY(minLat, z) - worldY(maxLat, z);
    if (dx <= W - 60 && dy <= H - 60) break;
  }
  const max = 2 ** z;
  const cx = (worldX(minLng, z) + worldX(maxLng, z)) / 2;
  const cy = (worldY(minLat, z) + worldY(maxLat, z)) / 2;
  const originX = cx - W / 2;
  const originY = cy - H / 2;

  const tiles: { key: string; left: number; top: number; uri: string }[] = [];
  const tx0 = Math.floor(originX / TILE);
  const tx1 = Math.floor((originX + W) / TILE);
  const ty0 = Math.floor(originY / TILE);
  const ty1 = Math.floor((originY + H) / TILE);
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      if (tx < 0 || ty < 0 || tx >= max || ty >= max) continue;
      tiles.push({
        key: `${tx}-${ty}`,
        left: tx * TILE - originX,
        top: ty * TILE - originY,
        uri: `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`,
      });
    }
  }

  const screen = points.map((p) => ({ x: worldX(p.longitude, z) - originX, y: worldY(p.latitude, z) - originY }));
  const polyline = screen.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const start = screen[0]!;
  const end = screen[screen.length - 1]!;

  return (
    <View style={[styles.map, { width: W, height: H }]}>
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={{ uri: t.uri, headers: { "User-Agent": "DriveBuddy/1.0 (https://github.com/elleskay/drivebuddy)" } }}
          style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE }}
        />
      ))}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Polyline points={polyline} fill="none" stroke="#1d4ed8" strokeOpacity={0.35} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={polyline} fill="none" stroke="#4f8cff" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={start.x} cy={start.y} r={7} fill="#22c55e" stroke="#fff" strokeWidth={2} />
        <Circle cx={end.x} cy={end.y} r={7} fill="#e5484d" stroke="#fff" strokeWidth={2} />
      </Svg>
      <Text style={styles.mapTag}>© OpenStreetMap</Text>
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
    alignSelf: "center",
  },
  muted: { color: "#5a6b8c", fontSize: 13 },
  mapTag: { position: "absolute", bottom: 8, left: 12, color: "#5a6b8c", fontSize: 11 },
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
