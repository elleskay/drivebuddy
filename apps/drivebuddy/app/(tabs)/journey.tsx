import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { api, type ErpGantry, type GpsSample, type TrafficItem } from "@/lib/api";
import { LOCATION_TASK, setActiveRouteId } from "@/lib/location-task";
import type { IconName } from "@/lib/icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { space, type Category } from "@/lib/theme";
import {
  Banner,
  Button,
  Card,
  IconButton,
  IconWell,
  Pill,
  Screen,
  ScreenHeader,
  Stat,
  Text,
} from "@/components/ui";

// Android foreground-service notification accent (matches app.json).
const NOTIFICATION_COLOR = "#4D7C0F";

const FEATURES: { label: string; icon: IconName; category: Category }[] = [
  { label: "ERP gantries", icon: "card-outline", category: "erp" },
  { label: "Traffic incidents", icon: "warning-outline", category: "traffic" },
  { label: "Rain warnings", icon: "rainy-outline", category: "weather" },
  { label: "Fuel stop tips", icon: "water-outline", category: "fuel" },
];

/** 83 -> "1:23", 3723 -> "1:02:03". */
function formatElapsed(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// In-drive alert tuning.
const GANTRY_RADIUS_KM = 0.35; // announce an ERP gantry within ~350m
const INCIDENT_RADIUS_KM = 1.0; // announce a traffic incident within ~1km
const ALERT_CLEAR_MS = 9000;

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export default function JourneyScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();
  const [tracking, setTracking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [alert, setAlert] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [background, setBackground] = useState(false);

  const routeId = useRef<string | null>(null);
  const buffer = useRef<GpsSample[]>([]);
  const sub = useRef<Location.LocationSubscription | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);
  const bgActive = useRef(false); // true when the OS background task is recording

  // In-drive alert state.
  const gantries = useRef<ErpGantry[]>([]);
  const incidents = useRef<TrafficItem[]>([]);
  const announced = useRef<Set<string>>(new Set());
  const mutedRef = useRef(false);
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fuelTipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Breathing pulse animation for the recording ring.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!tracking) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tracking, pulse]);

  useEffect(() => {
    mutedRef.current = muted;
    if (muted) void Speech.stop();
  }, [muted]);

  const announce = useCallback((key: string, text: string) => {
    if (announced.current.has(key)) return; // one alert per gantry/incident per drive
    announced.current.add(key);
    setAlert(text);
    if (!mutedRef.current) {
      try {
        Speech.speak(text, { rate: 1.0, pitch: 1.0 });
      } catch {
        // voice is a layer on top of the banner; never let TTS break the drive
      }
    }
    if (alertTimer.current) clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setAlert(null), ALERT_CLEAR_MS);
  }, []);

  const checkProximity = useCallback(
    (lat: number, lng: number) => {
      for (const g of gantries.current) {
        if (km(lat, lng, g.lat, g.lng) <= GANTRY_RADIUS_KM) {
          announce(`g:${g.id}`, `ERP gantry ahead: ${g.name}. Have your payment ready.`);
        }
      }
      incidents.current.forEach((t, i) => {
        if (km(lat, lng, t.latitude, t.longitude) <= INCIDENT_RADIUS_KM) {
          announce(`t:${i}`, `Traffic alert ahead: ${t.message}`);
        }
      });
    },
    [announce],
  );

  // Foreground-only fallback flush (used when background permission is denied).
  const flush = useCallback(async () => {
    if (!routeId.current || buffer.current.length === 0) return;
    const batch = buffer.current.splice(0, buffer.current.length);
    try {
      const route = await api.addPoints(routeId.current, batch);
      setDistance(route.totalDistance);
    } catch {
      // best-effort
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setError("Location permission is required to track your drive.");
        return;
      }
      const route = await api.startRoute();
      routeId.current = route.id;
      buffer.current = [];
      announced.current = new Set();
      setAlert(null);
      setDistance(0);
      setElapsed(0);
      startedAt.current = Date.now();
      setTracking(true);

      // Try to record via the OS background task so the drive keeps recording
      // with the screen off. Falls back to foreground posting if denied.
      let bg = false;
      try {
        const bgPerm = await Location.requestBackgroundPermissionsAsync();
        if (bgPerm.status === Location.PermissionStatus.GRANTED) {
          await setActiveRouteId(route.id);
          await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 4000,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "DriveBuddy is recording your drive",
              notificationBody: "Your route keeps recording even with the screen off.",
              notificationColor: NOTIFICATION_COLOR,
            },
          });
          bg = true;
        }
      } catch {
        bg = false;
      }
      bgActive.current = bg;
      setBackground(bg);

      // Load in-drive context (ERP gantry map + current incidents). Best-effort.
      api
        .erpGantries()
        .then((g) => (gantries.current = g))
        .catch(() => (gantries.current = []));
      api
        .traffic()
        .then((tf) => (incidents.current = tf.data ?? []))
        .catch(() => (incidents.current = []));

      // Start-of-drive advisories: a weather caution and a fuel-stop suggestion.
      Promise.all([
        api.weather().catch(() => null),
        api.petrol().catch(() => null),
        api.insights().catch(() => null),
      ])
        .then(([weather, petrol, insights]) => {
          const wet = weather?.data?.find((f) => /rain|shower|thunder/i.test(f.forecast));
          if (wet) {
            announce(
              "weather",
              `Weather alert: ${wet.forecast.toLowerCase()} expected. Drive carefully and keep your distance.`,
            );
          }
          if (insights && insights.recentDistanceKm >= 350 && petrol?.data?.length) {
            const cheapest = [...petrol.data].sort((a, b) => a.price - b.price)[0];
            fuelTipTimer.current = setTimeout(
              () =>
                announce(
                  "fuel",
                  `Fuel tip: you've driven about ${Math.round(insights.recentDistanceKm)} kilometres recently, so a refuel may be due. Cheapest 95 petrol is ${cheapest.brand} at $${cheapest.price.toFixed(2)} a litre.`,
                ),
              6000,
            );
          }
        })
        .catch(() => undefined);

      // Foreground watch: drives the in-drive voice/banner alerts. It also posts
      // points only when the background task is NOT the recorder (fallback).
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          checkProximity(latitude, longitude);
          if (!bgActive.current) {
            buffer.current.push({
              latitude,
              longitude,
              timestamp: new Date(loc.timestamp).toISOString(),
              altitude: loc.coords.altitude ?? undefined,
              speed: loc.coords.speed ?? undefined,
              accuracy: loc.coords.accuracy ?? undefined,
            });
            if (buffer.current.length >= 5) void flush();
          }
        },
      );

      timer.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
        if (bgActive.current) {
          // Distance is computed server-side from the background-posted points.
          api
            .getActiveRoute()
            .then((r) => {
              if (r) setDistance(r.totalDistance);
            })
            .catch(() => undefined);
        } else {
          void flush();
        }
      }, 5000);
    } catch {
      setError("Could not start tracking. Check your connection.");
    } finally {
      setStarting(false);
    }
  }, [flush, checkProximity, announce]);

  const stop = useCallback(async () => {
    setStopping(true);
    void Speech.stop();
    sub.current?.remove();
    sub.current = null;
    if (timer.current) clearInterval(timer.current);
    if (alertTimer.current) clearTimeout(alertTimer.current);
    if (fuelTipTimer.current) clearTimeout(fuelTipTimer.current);
    // Stop background recording if it was running.
    try {
      if (bgActive.current && (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
    } catch {
      // ignore
    }
    await setActiveRouteId(null);
    if (!bgActive.current) await flush();
    const id = routeId.current;
    try {
      if (id) await api.completeRoute(id);
    } finally {
      setTracking(false);
      setStopping(false);
      // push (not replace) keeps the tabs underneath, so Back returns to Drive.
      if (id) router.push(`/trip/${id}`);
    }
  }, [flush, router]);

  useEffect(() => {
    return () => {
      sub.current?.remove();
      if (timer.current) clearInterval(timer.current);
      if (alertTimer.current) clearTimeout(alertTimer.current);
      if (fuelTipTimer.current) clearTimeout(fuelTipTimer.current);
      void Speech.stop();
    };
  }, []);

  const clock = formatElapsed(elapsed);
  // Average speed once there is enough signal to be meaningful.
  const avgSpeed = elapsed >= 30 && distance > 0.05 ? distance / (elapsed / 3600) : null;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Drive"
          subtitle={tracking ? "Journey mode is on" : "Track your route, cost and live alerts"}
          right={
            tracking ? (
              <IconButton
                icon={muted ? "volume-mute-outline" : "volume-high-outline"}
                accessibilityLabel={muted ? "Turn voice alerts on" : "Turn voice alerts off"}
                variant={muted ? "surface" : "accent"}
                onPress={() => setMuted((m) => !m)}
              />
            ) : null
          }
        />

        {error ? <Banner tone="danger" icon="alert-circle-outline" message={error} /> : null}
        {alert ? (
          <Banner tone="warning" icon="warning-outline" title="Heads up" message={alert} />
        ) : null}

        {tracking ? (
          <View style={styles.statusRow}>
            <View style={styles.recDot} />
            <Text variant="subheadStrong">Recording</Text>
            <Pill
              label={background ? "Background" : "Foreground only"}
              tone={background ? "accent" : "warning"}
              icon={background ? "lock-closed-outline" : "phone-portrait-outline"}
            />
          </View>
        ) : null}

        <View style={styles.dialWrap}>
          {tracking ? (
            <>
              <Animated.View
                style={[
                  styles.glow,
                  {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                    transform: [
                      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) },
                    ],
                  },
                ]}
              />
              <View style={styles.dial} accessible accessibilityLabel={`Elapsed time ${clock}`}>
                <Text variant="overline" tone="tertiary">
                  Elapsed
                </Text>
                <Text variant={elapsed >= 3600 ? "display" : "hero"} tabular numberOfLines={1}>
                  {clock}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.halo, styles.haloOuter]} />
              <View style={[styles.halo, styles.haloInner]} />
              <Pressable
                onPress={() => void start()}
                disabled={starting}
                accessibilityRole="button"
                accessibilityLabel="Start drive"
                accessibilityState={{ busy: starting }}
                style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
              >
                {starting ? (
                  <ActivityIndicator color={t.color.onAccent} size="large" />
                ) : (
                  <>
                    <Ionicons name="play" size={46} color={t.color.onAccent} />
                    <Text variant="title3" tone="onAccent">
                      Start drive
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>

        {tracking ? (
          <>
            <View style={styles.statsRow}>
              <Stat
                label="Distance"
                value={distance.toFixed(2)}
                unit="km"
                icon="navigate-outline"
                category="routine"
              />
              <Stat
                label="Avg speed"
                value={avgSpeed != null ? String(Math.round(avgSpeed)) : "--"}
                unit="km/h"
                icon="speedometer-outline"
                category="fuel"
              />
            </View>
            <Button
              label="End drive"
              icon="stop"
              variant="danger"
              onPress={() => void stop()}
              loading={stopping}
            />
          </>
        ) : (
          <Card>
            <Text variant="subheadStrong" tone="secondary">
              Spoken alerts while you drive
            </Text>
            <View style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.feature}>
                  <IconWell icon={f.icon} category={f.category} size={34} />
                  <Text variant="subheadStrong" style={styles.flex}>
                    {f.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <Text variant="footnote" tone="tertiary" align="center" style={styles.note}>
          {tracking
            ? background
              ? "Recording in the background, so your route keeps tracking with the screen off. Voice alerts play while the app is open."
              : "Recording in the foreground. Allow background location to keep tracking with the screen off."
            : "Alerts are spoken aloud, so your eyes stay on the road."}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const DIAL = 232;

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, minWidth: 0 },
  content: { flexGrow: 1, padding: space.xl, paddingTop: space.md, gap: space.lg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },

  statusRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.color.dangerSolid },

  // Grows to fill the screen so the dial sits centered above the card.
  dialWrap: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    pointerEvents: "none",
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    backgroundColor: t.color.accent,
  },
  dial: {
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    borderWidth: 3,
    borderColor: t.color.accent,
    backgroundColor: t.color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  halo: { position: "absolute", pointerEvents: "none", backgroundColor: t.color.accentSoft },
  haloOuter: { width: 296, height: 296, borderRadius: 148, opacity: 0.55 },
  haloInner: { width: 256, height: 256, borderRadius: 128 },
  startBtn: {
    width: 212,
    height: 212,
    borderRadius: 106,
    backgroundColor: t.color.accent,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },

  statsRow: { flexDirection: "row", gap: space.md },
  features: { flexDirection: "row", flexWrap: "wrap", rowGap: space.md, marginTop: space.md },
  feature: { width: "50%", flexDirection: "row", alignItems: "center", gap: space.sm },
  note: { paddingHorizontal: space.lg, marginTop: "auto" },
}));
