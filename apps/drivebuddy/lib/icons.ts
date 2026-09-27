import type { Ionicons } from "@expo/vector-icons";
import type { NotificationType, Recommendation } from "./api";
import type { Category } from "./theme";

// Icon + color mappings shared by several screens.

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const REC_ICON: Record<Recommendation["category"], IconName> = {
  erp: "card-outline",
  fuel: "water-outline",
  routine: "repeat-outline",
  safety: "shield-checkmark-outline",
  carpark: "car-outline",
};

export const NOTIF_ICON: Record<NotificationType, IconName> = {
  PRE_DRIVE: "alarm-outline",
  REAL_TIME: "warning-outline",
  POST_TRIP: "receipt-outline",
  SYSTEM: "information-circle-outline",
};

export const NOTIF_CATEGORY: Record<NotificationType, Category> = {
  PRE_DRIVE: "routine",
  REAL_TIME: "traffic",
  POST_TRIP: "fuel",
  SYSTEM: "carpark",
};

/** Maps an NEA 2-hour forecast ("Thundery Showers", "Fair (Night)"...) to an icon. */
export function weatherVisual(forecast: string): { icon: IconName; category: Category } {
  const f = forecast.toLowerCase();
  if (f.includes("thunder")) return { icon: "thunderstorm-outline", category: "weather" };
  if (/rain|shower|drizzle/.test(f)) return { icon: "rainy-outline", category: "weather" };
  if (f.includes("partly")) {
    return f.includes("night")
      ? { icon: "cloudy-night-outline", category: "neutral" }
      : { icon: "partly-sunny-outline", category: "traffic" };
  }
  if (/cloud|overcast|haz|mist|fog|wind/.test(f))
    return { icon: "cloudy-outline", category: "neutral" };
  if (f.includes("night")) return { icon: "moon-outline", category: "carpark" };
  return { icon: "sunny-outline", category: "traffic" };
}
