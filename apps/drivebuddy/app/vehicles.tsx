import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type FuelType, type Vehicle } from "@/lib/api";

const FUEL_TYPES: FuelType[] = ["Petrol", "Hybrid", "Electric"];

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // add-form state
  const [number, setNumber] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("Petrol");
  const [consumption, setConsumption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setVehicles(await api.listVehicles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    const c = parseFloat(consumption);
    if (!number.trim() || Number.isNaN(c)) {
      setError("Enter a plate number and a fuel consumption number.");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await api.addVehicle({ vehicleNumber: number.trim().toUpperCase(), fuelType, fuelConsumption: c });
      setNumber("");
      setConsumption("");
      setFuelType("Petrol");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add vehicle.");
    } finally {
      setAdding(false);
    }
  }

  async function onSetMain(id: string) {
    setVehicles((v) => v.map((x) => ({ ...x, isMain: x.id === id })));
    try {
      await api.setMainVehicle(id);
    } finally {
      await load();
    }
  }

  function onDelete(v: Vehicle) {
    Alert.alert("Delete vehicle", `Remove ${v.vehicleNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.removeVehicle(v.id);
          await load();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f8cff" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No vehicles yet. Add your first one below.</Text>}
        renderItem={({ item }) => (
          <View style={styles.vehicle}>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.plate}>{item.vehicleNumber}</Text>
                {item.isMain ? <Text style={styles.mainBadge}>MAIN</Text> : null}
              </View>
              <Text style={styles.meta}>
                {item.fuelType} · {item.fuelConsumption} {item.fuelType === "Electric" ? "kWh" : "L"}/100km
              </Text>
            </View>
            {!item.isMain ? (
              <Pressable onPress={() => onSetMain(item.id)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Set main</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => onDelete(item)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Add a vehicle</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Plate number (e.g. SGP1234A)"
              placeholderTextColor="#6b7a99"
              autoCapitalize="characters"
              value={number}
              onChangeText={setNumber}
            />
            <View style={styles.fuelRow}>
              {FUEL_TYPES.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFuelType(f)}
                  style={[styles.fuelChip, fuelType === f && styles.fuelChipActive]}
                >
                  <Text style={[styles.fuelChipText, fuelType === f && styles.fuelChipTextActive]}>{f}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Fuel consumption (L or kWh / 100km)"
              placeholderTextColor="#6b7a99"
              keyboardType="decimal-pad"
              value={consumption}
              onChangeText={setConsumption}
            />
            <Pressable style={[styles.button, adding && { opacity: 0.6 }]} onPress={onAdd} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add vehicle</Text>}
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  center: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  empty: { color: "#9fb0d0", textAlign: "center", marginVertical: 16 },
  vehicle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  plate: { color: "#e7eefc", fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  mainBadge: {
    color: "#0b1220",
    backgroundColor: "#7ee0a2",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  meta: { color: "#9fb0d0", fontSize: 13, marginTop: 4 },
  smallBtn: { backgroundColor: "#1c2740", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnText: { color: "#4f8cff", fontSize: 12, fontWeight: "700" },
  deleteBtn: { padding: 6 },
  deleteText: { color: "#ff6b6b", fontSize: 16, fontWeight: "700" },
  addCard: {
    backgroundColor: "#101a2c",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  addTitle: { color: "#e7eefc", fontSize: 16, fontWeight: "700" },
  input: {
    backgroundColor: "#131c2e",
    borderColor: "#243049",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#e7eefc",
    fontSize: 16,
  },
  fuelRow: { flexDirection: "row", gap: 8 },
  fuelChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#243049",
    backgroundColor: "#131c2e",
  },
  fuelChipActive: { backgroundColor: "#4f8cff", borderColor: "#4f8cff" },
  fuelChipText: { color: "#9fb0d0", fontWeight: "700", fontSize: 13 },
  fuelChipTextActive: { color: "#fff" },
  button: { backgroundColor: "#4f8cff", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { color: "#ff6b6b" },
});
