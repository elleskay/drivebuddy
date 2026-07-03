import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { api, type ErpGantry, type GpsSample, type TrafficItem } from "@/lib/api";
import { LOCATION_TASK, setActiveRouteId } from "@/lib/location-task";
import { Button } from "@/components/ui";
import { colors, gradients, shadow } from "@/lib/theme";

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
              notificationColor: "#2563eb",
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
      if (id) router.replace(`/trip/${id}`);
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

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.inner}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {alert ? (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={20} color="#92400e" />
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Stat value={distance.toFixed(2)} unit="km" label="Distance" />
          <Stat value={`${mins}:${String(secs).padStart(2, "0")}`} unit="" label="Time" />
        </View>

        <View style={styles.pulseWrap}>
          {tracking ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseGlow,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                  transform: [
                    { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
                  ],
                },
              ]}
            />
          ) : null}
          {tracking ? (
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pulse}
            >
              <Ionicons name="radio" size={30} color="#fff" />
              <Text style={styles.pulseTextOn}>Recording</Text>
            </LinearGradient>
          ) : (
            <View style={styles.pulse}>
              <Ionicons name="car-sport-outline" size={34} color={colors.primary} />
              <Text style={styles.pulseText}>Ready</Text>
            </View>
          )}
        </View>

        {tracking ? (
          <Pressable style={styles.muteToggle} onPress={() => setMuted((m) => !m)}>
            <Ionicons
              name={muted ? "volume-mute-outline" : "volume-high-outline"}
              size={16}
              color={muted ? colors.textMuted : colors.primary}
            />
            <Text style={[styles.muteText, !muted && { color: colors.primary }]}>
              {muted ? "Voice alerts: off" : "Voice alerts: on"}
            </Text>
          </Pressable>
        ) : null}

        {!tracking ? (
          <Button label="Start drive" onPress={() => void start()} loading={starting} />
        ) : (
          <Button
            label="End drive"
            variant="danger"
            onPress={() => void stop()}
            loading={stopping}
          />
        )}

        <Text style={styles.note}>
          {tracking
            ? background
              ? "Recording in the background - your route keeps tracking with the screen off. Voice alerts play while the app is open."
              : "Recording in the foreground. Allow background location to keep tracking with the screen off."
            : "Journey Mode tracks your route and gives spoken alerts for ERP gantries, traffic, weather and fuel as you drive."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  inner: { flex: 1, padding: 24, gap: 24, justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 16 },
  stat: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  statValue: { color: "#0f172a", fontSize: 30, fontWeight: "800" },
  statUnit: { color: "#5b6b86", fontSize: 16, fontWeight: "600" },
  statLabel: { color: "#5b6b86", fontSize: 13, marginTop: 4 },
  pulseWrap: { alignItems: "center", justifyContent: "center", height: 200 },
  pulseGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#2563eb",
  },
  pulse: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...shadow,
    shadowOpacity: 0.2,
    shadowColor: "#4338ca",
  },
  pulseText: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  pulseTextOn: { color: "#fff", fontSize: 16, fontWeight: "800" },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  alertText: { color: "#92400e", fontSize: 15, fontWeight: "700", flex: 1 },
  muteToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  muteText: { color: "#5b6b86", fontSize: 13, fontWeight: "700" },
  note: { color: "#94a3b8", fontSize: 12, textAlign: "center" },
  error: { color: "#dc2626", textAlign: "center" },
});
