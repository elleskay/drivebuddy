import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { api, type ErpGantry, type GpsSample, type TrafficItem } from "@/lib/api";

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

  const routeId = useRef<string | null>(null);
  const buffer = useRef<GpsSample[]>([]);
  const sub = useRef<Location.LocationSubscription | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

  // In-drive alert state.
  const gantries = useRef<ErpGantry[]>([]);
  const incidents = useRef<TrafficItem[]>([]);
  const announced = useRef<Set<string>>(new Set());
  const mutedRef = useRef(false);
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
    if (muted) Speech.stop();
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

  const flush = useCallback(async () => {
    if (!routeId.current || buffer.current.length === 0) return;
    const batch = buffer.current.splice(0, buffer.current.length);
    try {
      const route = await api.addPoints(routeId.current, batch);
      setDistance(route.totalDistance);
    } catch {
      // keep going; points retry on next flush is out of scope for the pilot
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
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

      // Load in-drive context (ERP gantry map + current incidents). Best-effort.
      api
        .erpGantries()
        .then((g) => (gantries.current = g))
        .catch(() => (gantries.current = []));
      api
        .traffic()
        .then((tf) => (incidents.current = tf.data ?? []))
        .catch(() => (incidents.current = []));

      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
        (loc) => {
          buffer.current.push({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: new Date(loc.timestamp).toISOString(),
            altitude: loc.coords.altitude ?? undefined,
            speed: loc.coords.speed ?? undefined,
            accuracy: loc.coords.accuracy ?? undefined,
          });
          checkProximity(loc.coords.latitude, loc.coords.longitude);
          if (buffer.current.length >= 5) void flush();
        },
      );
      timer.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
        void flush();
      }, 5000);
    } catch (e) {
      setError("Could not start tracking. Check your connection.");
    } finally {
      setStarting(false);
    }
  }, [flush, checkProximity]);

  const stop = useCallback(async () => {
    setStopping(true);
    Speech.stop();
    sub.current?.remove();
    sub.current = null;
    if (timer.current) clearInterval(timer.current);
    if (alertTimer.current) clearTimeout(alertTimer.current);
    await flush();
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
      Speech.stop();
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
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Stat value={distance.toFixed(2)} unit="km" label="Distance" />
          <Stat value={`${mins}:${String(secs).padStart(2, "0")}`} unit="" label="Time" />
        </View>

        <View style={styles.pulseWrap}>
          <View style={[styles.pulse, tracking && styles.pulseActive]}>
            <Text style={styles.pulseText}>{tracking ? "Recording" : "Ready"}</Text>
          </View>
        </View>

        {tracking ? (
          <Pressable style={styles.muteToggle} onPress={() => setMuted((m) => !m)}>
            <Text style={styles.muteText}>{muted ? "Voice alerts: off" : "Voice alerts: on"}</Text>
          </Pressable>
        ) : null}

        {!tracking ? (
          <Pressable style={[styles.button, starting && { opacity: 0.6 }]} onPress={start} disabled={starting}>
            {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start drive</Text>}
          </Pressable>
        ) : (
          <Pressable style={[styles.button, styles.stop, stopping && { opacity: 0.6 }]} onPress={stop} disabled={stopping}>
            {stopping ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>End drive</Text>}
          </Pressable>
        )}

        <Text style={styles.note}>
          Journey Mode tracks your route and gives spoken alerts for ERP gantries and nearby traffic as you
          drive. Keep the screen on. (Background tracking arrives with the production build.)
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
  container: { flex: 1, backgroundColor: "#0b1220" },
  inner: { flex: 1, padding: 24, gap: 24, justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 16 },
  stat: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  statValue: { color: "#e7eefc", fontSize: 30, fontWeight: "800" },
  statUnit: { color: "#9fb0d0", fontSize: 16, fontWeight: "600" },
  statLabel: { color: "#9fb0d0", fontSize: 13, marginTop: 4 },
  pulseWrap: { alignItems: "center" },
  pulse: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseActive: { borderColor: "#4f8cff", backgroundColor: "#16223a" },
  pulseText: { color: "#e7eefc", fontSize: 16, fontWeight: "700" },
  alertBanner: {
    backgroundColor: "#3a2a0c",
    borderColor: "#e0a106",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  alertText: { color: "#ffd874", fontSize: 15, fontWeight: "700", textAlign: "center" },
  muteToggle: {
    alignSelf: "center",
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  muteText: { color: "#9fb0d0", fontSize: 13, fontWeight: "700" },
  button: { backgroundColor: "#4f8cff", borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  stop: { backgroundColor: "#e5484d" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  note: { color: "#5a6b8c", fontSize: 12, textAlign: "center" },
  error: { color: "#ff6b6b", textAlign: "center" },
});
