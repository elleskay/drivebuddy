import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { api, ApiError, type FuelType, type Vehicle } from "@/lib/api";
import { confirmAction, notify } from "@/lib/dialog";
import type { IconName } from "@/lib/icons";
import { makeStyles, useTheme } from "@/lib/theme-context";
import { font, radius, space, type Category } from "@/lib/theme";
import { SkeletonList } from "@/components/skeleton";
import {
  Banner,
  Button,
  Card,
  EmptyState,
  IconButton,
  IconWell,
  Pill,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  TextField,
} from "@/components/ui";

const FUEL_ICON: Record<FuelType, IconName> = {
  Petrol: "car-sport-outline",
  Hybrid: "leaf-outline",
  Electric: "flash-outline",
};
const FUEL_CATEGORY: Record<FuelType, Category> = {
  Petrol: "routine",
  Hybrid: "fuel",
  Electric: "weather",
};

const FUEL_OPTIONS: { label: string; value: FuelType }[] = [
  { label: "Petrol", value: "Petrol" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "Electric", value: "Electric" },
];

export default function VehiclesScreen() {
  const t = useTheme();
  const styles = useStyles();
  const listRef = useRef<FlatList<Vehicle>>(null);
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
    // The editor is the list footer; bring it into view.
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
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

  async function onDelete(v: Vehicle) {
    const ok = await confirmAction({
      title: "Delete vehicle",
      message: `Remove ${v.vehicleNumber}?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.removeVehicle(v.id);
    } catch (e) {
      notify("Delete failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      await load();
    }
  }

  if (loading) {
    return (
      <Screen>
        <SkeletonList />
      </Screen>
    );
  }

  const unit = fuelType === "Electric" ? "kWh" : "L";

  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <ScreenHeader
            title="My vehicles"
            subtitle="Fuel cost on every trip uses your main vehicle"
            style={styles.header}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title="No vehicles yet"
            message="Add your car below so trip costs use its real fuel consumption."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.vehicle}>
            <View style={styles.vehicleTop}>
              <View style={styles.plate}>
                <Text style={styles.plateText} numberOfLines={1}>
                  {item.vehicleNumber}
                </Text>
              </View>
              {item.isMain ? (
                <Pill label="Main" tone="solid" icon="star" />
              ) : (
                <Button
                  label="Set main"
                  icon="star-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() => void onSetMain(item.id)}
                />
              )}
            </View>
            <View style={styles.vehicleMeta}>
              <IconWell
                icon={FUEL_ICON[item.fuelType]}
                category={FUEL_CATEGORY[item.fuelType]}
                size={36}
              />
              <View style={styles.flex}>
                <Text variant="callout">{item.fuelType}</Text>
                <Text variant="footnote" tone="secondary">
                  {item.fuelConsumption} {item.fuelType === "Electric" ? "kWh" : "L"} / 100 km
                </Text>
              </View>
              <IconButton
                icon="create-outline"
                variant="muted"
                size={36}
                accessibilityLabel={`Edit ${item.vehicleNumber}`}
                onPress={() => startEdit(item)}
              />
              <IconButton
                icon="trash-outline"
                variant="muted"
                size={36}
                color={t.color.danger}
                accessibilityLabel={`Delete ${item.vehicleNumber}`}
                onPress={() => void onDelete(item)}
              />
            </View>
          </Card>
        )}
        ListFooterComponent={
          <Card style={styles.form}>
            <Text variant="title3">{editingId ? "Edit vehicle" : "Add a vehicle"}</Text>
            {error ? <Banner tone="danger" icon="alert-circle-outline" message={error} /> : null}
            <TextField
              label="Plate number"
              icon="pricetag-outline"
              placeholder="e.g. SGP1234A"
              autoCapitalize="characters"
              value={number}
              onChangeText={setNumber}
            />
            <View style={styles.fieldGroup}>
              <Text variant="subheadStrong" tone="secondary">
                Fuel type
              </Text>
              <Segmented options={FUEL_OPTIONS} value={fuelType} onChange={setFuelType} />
            </View>
            <TextField
              label={`Consumption (${unit} / 100 km)`}
              icon="speedometer-outline"
              placeholder={fuelType === "Electric" ? "e.g. 15" : "e.g. 7.5"}
              keyboardType="decimal-pad"
              value={consumption}
              onChangeText={setConsumption}
            />
            <Button
              label={editingId ? "Save changes" : "Add vehicle"}
              icon={editingId ? "checkmark" : "add"}
              onPress={() => void onSubmit()}
              loading={adding}
            />
            {editingId ? (
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                onPress={resetForm}
                disabled={adding}
              />
            ) : null}
          </Card>
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.xl, paddingTop: space.xs, gap: space.md },
  header: { marginBottom: space.sm },

  vehicle: { gap: space.md },
  vehicleTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // Singapore number plate: white characters on black.
  plate: {
    backgroundColor: t.color.plate,
    borderRadius: radius.xs,
    borderWidth: t.scheme === "dark" ? 1 : 0,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  plateText: {
    color: t.color.onPlate,
    fontFamily: font.bold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 2,
  },
  vehicleMeta: { flexDirection: "row", alignItems: "center", gap: space.sm },

  form: { gap: space.lg, marginTop: space.sm },
  fieldGroup: { gap: space.sm },
}));
