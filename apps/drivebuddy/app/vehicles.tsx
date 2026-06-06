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
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError, type FuelType, type Vehicle } from "@/lib/api";
import { SkeletonList } from "@/components/skeleton";
import { accent, radius, shadow } from "@/lib/theme";

const FUEL_ICON: Record<FuelType, React.ComponentProps<typeof Ionicons>["name"]> = {
  Petrol: "car-sport-outline",
  Hybrid: "leaf-outline",
  Electric: "flash-outline",
};
const FUEL_TINT: Record<FuelType, string> = {
  Petrol: accent.routine,
  Hybrid: accent.fuel,
  Electric: accent.weather,
};

const FUEL_TYPES: FuelType[] = ["Petrol", "Hybrid", "Electric"];

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // add/edit-form state (the footer form doubles as the editor)
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function resetForm() {
    setNumber("");
    setConsumption("");
    setFuelType("Petrol");
    setEditingId(null);
    setError(null);
  }

  function startEdit(v: Vehicle) {
    setEditingId(v.id);
    setNumber(v.vehicleNumber);
    setFuelType(v.fuelType);
    setConsumption(String(v.fuelConsumption));
    setError(null);
  }

  async function onSubmit() {
    const c = parseFloat(consumption);
    if (!number.trim() || Number.isNaN(c)) {
      setError("Enter a plate number and a fuel consumption number.");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const payload = { vehicleNumber: number.trim().toUpperCase(), fuelType, fuelConsumption: c };
      if (editingId) {
        await api.updateVehicle(editingId, payload);
      } else {
        await api.addVehicle(payload);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save vehicle.");
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
      <View style={styles.container}>
        <SkeletonList />
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
            <View style={[styles.vIcon, { backgroundColor: FUEL_TINT[item.fuelType] + "1a" }]}>
              <Ionicons name={FUEL_ICON[item.fuelType]} size={22} color={FUEL_TINT[item.fuelType]} />
            </View>
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
            <Pressable onPress={() => startEdit(item)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(item)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>{editingId ? "Edit vehicle" : "Add a vehicle"}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Plate number (e.g. SGP1234A)"
              placeholderTextColor="#94a3b8"
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
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={consumption}
              onChangeText={setConsumption}
            />
            <Pressable style={[styles.button, adding && { opacity: 0.6 }]} onPress={onSubmit} disabled={adding}>
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{editingId ? "Save changes" : "Add vehicle"}</Text>
              )}
            </Pressable>
            {editingId ? (
              <Pressable style={styles.cancelBtn} onPress={resetForm} disabled={adding}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, backgroundColor: "#f5f7fb", justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  empty: { color: "#5b6b86", textAlign: "center", marginVertical: 16 },
  vehicle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    ...shadow,
  },
  vIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  plate: { color: "#0f172a", fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  mainBadge: {
    color: "#f5f7fb",
    backgroundColor: "#16a34a",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  meta: { color: "#5b6b86", fontSize: 13, marginTop: 4 },
  smallBtn: { backgroundColor: "#e8f0ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },
  deleteBtn: { padding: 6 },
  deleteText: { color: "#dc2626", fontSize: 16, fontWeight: "700" },
  addCard: {
    backgroundColor: "#eef2f9",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  addTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e9f2",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0f172a",
    fontSize: 16,
  },
  fuelRow: { flexDirection: "row", gap: 8 },
  fuelChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4e9f2",
    backgroundColor: "#ffffff",
  },
  fuelChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  fuelChipText: { color: "#5b6b86", fontWeight: "700", fontSize: 13 },
  fuelChipTextActive: { color: "#fff" },
  button: { backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelText: { color: "#5b6b86", fontSize: 14, fontWeight: "600" },
  error: { color: "#dc2626" },
});
