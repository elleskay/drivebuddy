import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import type * as Location from "expo-location";
import { secureGet, secureSet, secureDelete } from "./secure-storage";
import { api } from "./api";

// Background location task. Registered at app start (imported in app/_layout.tsx)
// so `Location.startLocationUpdatesAsync(LOCATION_TASK, ...)` can hand drive
// recording off to the OS - points keep flowing to the API with the screen off
// or the app backgrounded.
export const LOCATION_TASK = "drivebuddy-location";
const ACTIVE_ROUTE_KEY = "active_route_id";

export async function setActiveRouteId(id: string | null): Promise<void> {
  if (id) await secureSet(ACTIVE_ROUTE_KEY, id);
  else await secureDelete(ACTIVE_ROUTE_KEY);
}
export function getActiveRouteId(): Promise<string | null> {
  return secureGet(ACTIVE_ROUTE_KEY);
}

interface LocationTaskData {
  locations?: Location.LocationObject[];
}

// TaskManager has no web implementation; defining a task there throws at import.
// The web demo records drives with the foreground watcher only (no OS background task).
if (Platform.OS !== "web") {
  // The executor is typed `=> void`, but TaskManager awaits the returned promise
  // before notifying the OS the task finished; fire-and-forget here would let the
  // OS suspend the app mid-upload and drop the batch.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
}
