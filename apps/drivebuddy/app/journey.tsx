import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { api, type GpsSample } from "@/lib/api";

export default function JourneyScreen() {
  const router = useRouter();
  const [tracking, setTracking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const routeId = useRef<string | null>(null);
  const buffer = useRef<GpsSample[]>([]);
  const sub = useRef<Location.LocationSubscription | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

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
      setDistance(0);
      setElapsed(0);
      startedAt.current = Date.now();
      setTracking(true);

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
  }, [flush]);

  const stop = useCallback(async () => {
    setStopping(true);
    sub.current?.remove();
    sub.current = null;
    if (timer.current) clearInterval(timer.current);
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
    };
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.inner}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statsRow}>
          <Stat value={distance.toFixed(2)} unit="km" label="Distance" />
          <Stat value={`${mins}:${String(secs).padStart(2, "0")}`} unit="" label="Time" />
        </View>

        <View style={styles.pulseWrap}>
          <View style={[styles.pulse, tracking && styles.pulseActive]}>
            <Text style={styles.pulseText}>{tracking ? "Recording" : "Ready"}</Text>
          </View>
        </View>

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
          Tracking uses foreground GPS. Keep the screen on while driving. (Background tracking & a live map
          arrive with the production build.)
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
  button: { backgroundColor: "#4f8cff", borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  stop: { backgroundColor: "#e5484d" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  note: { color: "#5a6b8c", fontSize: 12, textAlign: "center" },
  error: { color: "#ff6b6b", textAlign: "center" },
});
