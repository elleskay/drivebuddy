import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

// Background location task. Registered at app start (imported in app/_layout.tsx)
// so `Location.startLocationUpdatesAsync(LOCATION_TASK, ...)` can hand drive
// recording off to the OS - points keep flowing to the API with the screen off
// or the app backgrounded.
export const LOCATION_TASK = "drivebuddy-location";
const ACTIVE_ROUTE_KEY = "active_route_id";

export async function setActiveRouteId(id: string | null): Promise<void> {
  if (id) await SecureStore.setItemAsync(ACTIVE_ROUTE_KEY, id);
  else await SecureStore.deleteItemAsync(ACTIVE_ROUTE_KEY);
}
export function getActiveRouteId(): Promise<string | null> {
  return SecureStore.getItemAsync(ACTIVE_ROUTE_KEY);
}

interface LocationTaskData {
  locations?: Location.LocationObject[];
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data ?? {}) as LocationTaskData;
  if (!locations?.length) return;
  const routeId = await getActiveRouteId();
  if (!routeId) return;
  try {
    await api.addPoints(
      routeId,
      locations.map((l) => ({
        latitude: l.coords.latitude,
        longitude: l.coords.longitude,
        timestamp: new Date(l.timestamp).toISOString(),
        altitude: l.coords.altitude ?? undefined,
        speed: l.coords.speed ?? undefined,
        accuracy: l.coords.accuracy ?? undefined,
      })),
    );
  } catch {
    // Best-effort: a failed background flush just drops that batch; the next
    // batch (and the foreground summary on completion) still recompute stats.
  }
});
