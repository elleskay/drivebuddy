import Constants from "expo-constants";
import { getAccessToken, getRefreshToken, setTokens } from "./auth";

// EXPO_PUBLIC_* is inlined at build time and is public: the API base URL is safe
// to ship (API keys are not). Falls back to app.json extra, then localhost.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:3000";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string };
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  homeAddress: string | null;
  createdAt: string;
}

export type FuelType = "Petrol" | "Hybrid" | "Electric";

export interface Vehicle {
  id: string;
  userId: string;
  vehicleNumber: string;
  fuelType: FuelType;
  fuelConsumption: string;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "message" in body && String((body as { message: unknown }).message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return body;
}

/** Authenticated fetch. Attaches the bearer token and refreshes once on 401. */
async function authed(path: string, init: RequestInit = {}, retry = true): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401 && retry && (await tryRefresh())) {
    return authed(path, init, false);
  }
  return parse(res);
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as AuthResult;
  await setTokens(data.accessToken, data.refreshToken);
  return true;
}

export const api = {
  async register(email: string, password: string, fullName: string): Promise<AuthResult> {
    const data = (await parse(
      await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      }),
    )) as AuthResult;
    await setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const data = (await parse(
      await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    )) as AuthResult;
    await setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  getProfile: () => authed("/users/me") as Promise<Profile>,
  updateProfile: (
    patch: Partial<Pick<Profile, "fullName" | "gender" | "dateOfBirth" | "homeAddress">>,
  ) => authed("/users/me", { method: "PATCH", body: JSON.stringify(patch) }) as Promise<Profile>,

  listVehicles: () => authed("/vehicles") as Promise<Vehicle[]>,
  addVehicle: (v: { vehicleNumber: string; fuelType: FuelType; fuelConsumption: number }) =>
    authed("/vehicles", { method: "POST", body: JSON.stringify(v) }) as Promise<Vehicle>,
  updateVehicle: (
    id: string,
    patch: Partial<{ vehicleNumber: string; fuelType: FuelType; fuelConsumption: number }>,
  ) => authed(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(patch) }) as Promise<Vehicle>,
  setMainVehicle: (id: string) =>
    authed(`/vehicles/${id}/set-main`, { method: "POST" }) as Promise<Vehicle>,
  removeVehicle: (id: string) => authed(`/vehicles/${id}`, { method: "DELETE" }) as Promise<unknown>,

  // Public Singapore live-data feeds (no auth needed).
  weather: () => authed("/external/dashboard/weather") as Promise<Feed<WeatherItem[]>>,
  traffic: () => authed("/external/dashboard/traffic") as Promise<Feed<TrafficItem[]>>,
  erp: () => authed("/external/dashboard/erp") as Promise<Feed<ErpItem[]>>,
  carpark: () => authed("/external/dashboard/carpark") as Promise<Feed<CarparkItem[]>>,
  petrol: () => authed("/external/dashboard/petrol") as Promise<Feed<PetrolItem[]>>,

  // Trips / GPS tracking
  startRoute: (name?: string) =>
    authed("/drive-monitor/routes", { method: "POST", body: JSON.stringify({ name }) }) as Promise<DrivingRoute>,
  addPoints: (routeId: string, points: GpsSample[]) =>
    authed(`/drive-monitor/routes/${routeId}/points`, {
      method: "POST",
      body: JSON.stringify({ points }),
    }) as Promise<DrivingRoute>,
  completeRoute: (routeId: string) =>
    authed(`/drive-monitor/routes/${routeId}/complete`, { method: "POST" }) as Promise<{
      route: RouteDetail;
      summary: TripSummary;
    }>,
  listRoutes: () => authed("/drive-monitor/routes") as Promise<DrivingRoute[]>,
  getActiveRoute: () => authed("/drive-monitor/routes/active") as Promise<DrivingRoute | null>,
  getRoute: (id: string) => authed(`/drive-monitor/routes/${id}`) as Promise<RouteDetail>,
  deleteRoute: (id: string) =>
    authed(`/drive-monitor/routes/${id}`, { method: "DELETE" }) as Promise<{ ok: boolean }>,
  // Returns the route's GPS trace as a GPX document (text, not JSON).
  async exportRouteGpx(id: string): Promise<string> {
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}/drive-monitor/routes/${id}/export`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`);
    return res.text();
  },
  listTrips: () => authed("/trips") as Promise<TripSummary[]>,
  getTrip: (routeId: string) => authed(`/trips/${routeId}`) as Promise<TripSummary>,

  // Notifications + push
  registerDevice: (token: string, platform?: "ios" | "android") =>
    authed("/notifications/devices", { method: "POST", body: JSON.stringify({ token, platform }) }) as Promise<{ ok: boolean }>,
  unregisterDevice: (token: string) =>
    authed("/notifications/devices", { method: "DELETE", body: JSON.stringify({ token }) }) as Promise<{ ok: boolean }>,
  listNotifications: () => authed("/notifications") as Promise<AppNotification[]>,
  unreadCount: () => authed("/notifications/unread-count") as Promise<{ count: number }>,
  markNotificationRead: (id: string) =>
    authed(`/notifications/${id}/read`, { method: "POST" }) as Promise<{ ok: boolean }>,
  markAllNotificationsRead: () =>
    authed("/notifications/read-all", { method: "POST" }) as Promise<{ updated: number }>,
  getNotificationSettings: () => authed("/notifications/settings") as Promise<NotificationSettings>,
  updateNotificationSettings: (patch: Partial<NotificationSettings>) =>
    authed("/notifications/settings", { method: "PATCH", body: JSON.stringify(patch) }) as Promise<NotificationSettings>,
  sendTestNotification: () =>
    authed("/notifications/test", { method: "POST", body: JSON.stringify({}) }) as Promise<AppNotification | null>,

  // AI assistant
  aiAsk: (text: string, speak = false) =>
    authed("/ai/ask", { method: "POST", body: JSON.stringify({ text, speak }) }) as Promise<AiAnswer>,
  aiVoice: (audioBase64: string, format = "m4a", speak = true) =>
    authed("/ai/voice", { method: "POST", body: JSON.stringify({ audioBase64, format, speak }) }) as Promise<AiVoiceAnswer>,

  // Route analysis + recommendations
  insights: () => authed("/route-analysis/insights") as Promise<Insights>,
  listRecommendations: () => authed("/route-analysis/recommendations") as Promise<Recommendation[]>,
  refreshRecommendations: () =>
    authed("/route-analysis/recommendations/refresh", { method: "POST" }) as Promise<Recommendation[]>,
  dismissRecommendation: (id: string) =>
    authed(`/route-analysis/recommendations/${id}/dismiss`, { method: "POST" }) as Promise<{ ok: boolean }>,
};

export interface Insights {
  totalTrips: number;
  totalDistanceKm: number;
  totalCost: number;
  avgCostPerTrip: number;
  avgDistanceKm: number;
  last7: { trips: number; cost: number };
  prev7: { trips: number; cost: number };
  peakHour: number | null;
  busiestDay: string | null;
  erpPeakTrips: number;
  topDestinations: { label: string; lat: number; lng: number; count: number }[];
  recentDistanceKm: number;
  crossesCauseway: string | null;
}
export interface Recommendation {
  id: string;
  category: "erp" | "fuel" | "routine" | "safety" | "carpark";
  title: string;
  body: string;
  score: number;
  dismissed: boolean;
  createdAt: string;
}

export interface AiAnswer {
  answer: string;
  audio?: { base64: string; format: "mp3" };
}
export interface AiVoiceAnswer extends AiAnswer {
  transcript: string;
}

export type NotificationType = "PRE_DRIVE" | "REAL_TIME" | "POST_TRIP" | "SYSTEM";
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}
export interface NotificationSettings {
  userId: string;
  preDrive: boolean;
  realTime: boolean;
  postTrip: boolean;
  system: boolean;
  speed: boolean;
  hazard: boolean;
  erp: boolean;
  traffic: boolean;
  weather: boolean;
  updatedAt: string;
}

export interface DrivingRoute {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
}
export interface RoutePointLite {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number | null;
  altitude: number | null;
}
export interface RouteDetail extends DrivingRoute {
  points: RoutePointLite[];
}
export interface GpsSample {
  latitude: number;
  longitude: number;
  timestamp: string;
  altitude?: number;
  speed?: number;
  accuracy?: number;
}
export interface TripSummary {
  id: string;
  routeId: string;
  routeName: string | null;
  distanceKm: number;
  durationMin: number;
  startTime: string;
  endTime: string;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  erpCost: string;
  fuelCost: string;
  parkingCost: string;
  createdAt: string;
}

export interface Feed<T> {
  source: string;
  lastUpdated: string;
  keyRequired?: boolean;
  data: T;
}
export interface WeatherItem {
  area: string;
  forecast: string;
}
export interface TrafficItem {
  type: string;
  message: string;
  latitude: number;
  longitude: number;
}
export interface ErpItem {
  zone: string;
  chargeAmount: number;
  startTime: string;
  endTime: string;
  vehicleType: string;
}
export interface CarparkItem {
  id: string;
  area: string;
  development: string;
  availableLots: number;
  lotType: string;
}
export interface PetrolItem {
  brand: string;
  product: string;
  price: number;
}
