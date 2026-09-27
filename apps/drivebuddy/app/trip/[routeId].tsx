import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Polyline } from "react-native-svg";
import { api, type RouteDetail, type TripSummary } from "@/lib/api";
import { confirmAction, notify } from "@/lib/dialog";
import { dayLabel, driveName, formatDuration, formatTime, money } from "@/lib/format";
import { shareTextFile } from "@/lib/share";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import { Skeleton } from "@/components/skeleton";
import { Button, Card, Divider, Screen, ScreenHeader, Text } from "@/components/ui";

const MAP_HEIGHT = 240;

export default function TripScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [mapWidth, setMapWidth] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const [r, tr] = await Promise.all([
          api.getRoute(routeId),
          api.getTrip(routeId).catch(() => null),
        ]);
        setRoute(r);
        setTrip(tr);
      } finally {
        setLoading(false);
      }
    })();
  }, [routeId]);

  async function onExport() {
    if (!route) return;
    try {
      setBusy("export");
      const gpx = await api.exportRouteGpx(route.id);
      await shareTextFile(`${route.name || "DriveBuddy route"}.gpx`, gpx, "application/gpx+xml");
    } catch (e) {
      notify("Export failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!route) return;
    const ok = await confirmAction({
      title: "Delete drive?",
      message: "This permanently removes the route, its GPS trace and summary.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      setBusy("delete");
      await api.deleteRoute(route.id);
      if (router.canGoBack()) router.back();
      else router.replace("/history");
    } catch (e) {
      notify("Delete failed", e instanceof Error ? e.message : "Please try again.");
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.content}>
          <Skeleton width="60%" height={30} radius={10} />
          <Skeleton width="100%" height={MAP_HEIGHT} radius={radius.lg} />
          <Skeleton width="100%" height={84} radius={radius.lg} />
          <Skeleton width="100%" height={200} radius={radius.lg} />
        </View>
      </Screen>
    );
  }

  const start = route ? new Date(route.startTime) : null;
  const end = route?.endTime ? new Date(route.endTime) : null;
  const fuel = trip ? parseFloat(trip.fuelCost) : 0;
  const erp = trip ? parseFloat(trip.erpCost) : 0;
  const parking = trip ? parseFloat(trip.parkingCost) : 0;
  const total = fuel + erp + parking;
  const costs = [
    { label: "Fuel", value: fuel, color: t.category.fuel },
    { label: "ERP", value: erp, color: t.category.erp },
    { label: "Parking", value: parking, color: t.category.carpark },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={start ? dayLabel(start) : undefined}
          title={route?.name || (start ? driveName(start) : "Trip summary")}
          subtitle={
            start ? `${formatTime(start)}${end ? ` to ${formatTime(end)}` : ""}` : undefined
          }
        />

        <View onLayout={(e) => setMapWidth(Math.round(e.nativeEvent.layout.width))}>
          {mapWidth > 0 ? (
            <RouteMap points={route?.points ?? []} width={mapWidth} height={MAP_HEIGHT} />
          ) : (
            <View style={[styles.map, { height: MAP_HEIGHT }]} />
          )}
        </View>

        <Card style={styles.stats}>
          <MiniStat value={(route?.totalDistance ?? 0).toFixed(2)} unit="km" label="Distance" />
          <View style={styles.statDivider} />
          <MiniStat value={trip ? formatDuration(trip.durationMin) : "--"} label="Duration" />
          <View style={styles.statDivider} />
          <MiniStat
            value={String(Math.round(route?.averageSpeed ?? 0))}
            unit="km/h"
            label="Avg speed"
          />
        </Card>

        <Card>
          <Text variant="subheadStrong" tone="secondary">
            Trip cost
          </Text>
          <Text variant="display" tabular style={styles.total}>
            {money(total)}
          </Text>
          <View style={styles.bar}>
            {total > 0
              ? costs
                  .filter((c) => c.value > 0)
                  .map((c) => (
                    <View key={c.label} style={{ flex: c.value, backgroundColor: c.color }} />
                  ))
              : null}
          </View>
          {costs.map((c, i) => (
            <View key={c.label}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.costRow}>
                <View style={[styles.swatch, { backgroundColor: c.color }]} />
                <Text variant="callout" style={styles.flex}>
                  {c.label}
                </Text>
                <Text variant="bodyStrong" tabular>
                  {money(c.value)}
                </Text>
              </View>
            </View>
          ))}
          {trip ? null : (
            <Text variant="footnote" tone="tertiary" style={styles.pending}>
              Summary still generating…
            </Text>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            label="Export GPX"
            icon="share-outline"
            variant="secondary"
            size="md"
            onPress={() => void onExport()}
            loading={busy === "export"}
            disabled={busy === "delete" || !route}
            style={styles.flex}
          />
          <Button
            label="Delete"
            icon="trash-outline"
            variant="dangerSoft"
            size="md"
            onPress={() => void onDelete()}
            loading={busy === "delete"}
            disabled={busy === "export" || !route}
            style={styles.flex}
          />
        </View>

        {!router.canGoBack() ? (
          <Button label="Done" onPress={() => router.replace("/")} variant="primary" />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function MiniStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.miniStat}>
      <Text variant="title3" tabular numberOfLines={1}>
        {value}
        {unit ? (
          <Text variant="caption" tone="secondary">
            {" "}
            {unit}
          </Text>
        ) : null}
      </Text>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
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
function RouteMap({
  points,
  width: W,
  height: H,
}: {
  points: { latitude: number; longitude: number }[];
  width: number;
  height: number;
}) {
  const t = useTheme();
  const styles = useStyles();
  if (points.length < 2) {
    return (
      <View style={[styles.map, styles.mapEmpty, { height: H }]}>
        <Text variant="subhead" tone="tertiary">
          Not enough GPS points to draw the route.
        </Text>
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

  const screen = points.map((p) => ({
    x: worldX(p.longitude, z) - originX,
    y: worldY(p.latitude, z) - originY,
  }));
  const polyline = screen.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const first = screen[0];
  const last = screen[screen.length - 1];

  return (
    <View style={[styles.map, { height: H }]}>
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{
            uri: tile.uri,
            headers: { "User-Agent": "DriveBuddy/1.0 (https://github.com/elleskay/drivebuddy)" },
          }}
          style={{
            position: "absolute",
            left: tile.left,
            top: tile.top,
            width: TILE,
            height: TILE,
          }}
        />
      ))}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Polyline
          points={polyline}
          fill="none"
          stroke={t.color.accent}
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Polyline
          points={polyline}
          fill="none"
          stroke="#0B0C0E"
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle
          cx={first.x}
          cy={first.y}
          r={7}
          fill={t.color.accent}
          stroke="#0B0C0E"
          strokeWidth={2.5}
        />
        <Circle cx={last.x} cy={last.y} r={7} fill="#0B0C0E" stroke="#FFFFFF" strokeWidth={2.5} />
      </Svg>
      <View style={styles.mapTag}>
        <Text variant="caption" style={styles.mapTagText}>
          © OpenStreetMap
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  content: { padding: space.xl, paddingTop: space.xs, gap: space.lg },

  map: {
    backgroundColor: t.color.surfaceMuted,
    borderColor: t.color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  mapEmpty: { alignItems: "center", justifyContent: "center", padding: space.xl },
  mapTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mapTagText: { color: "#3A3F47", fontSize: 10, lineHeight: 13 },

  stats: { flexDirection: "row", alignItems: "center", paddingVertical: space.md },
  miniStat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: t.color.border },

  total: { marginTop: space.xs },
  bar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    gap: 3,
    backgroundColor: t.color.surfaceMuted,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  costRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  pending: { marginTop: space.sm },

  actions: { flexDirection: "row", gap: space.md },
}));
