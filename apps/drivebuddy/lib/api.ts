import Constants from "expo-constants";
import { getAccessToken, getRefreshToken, setTokens } from "./auth";

// EXPO_PUBLIC_* is inlined at build time and is public — the API base URL is safe
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
  setMainVehicle: (id: string) =>
    authed(`/vehicles/${id}/set-main`, { method: "POST" }) as Promise<Vehicle>,
  removeVehicle: (id: string) => authed(`/vehicles/${id}`, { method: "DELETE" }) as Promise<unknown>,

  // Public Singapore live-data feeds (no auth needed).
  weather: () => authed("/external/dashboard/weather") as Promise<Feed<WeatherItem[]>>,
  traffic: () => authed("/external/dashboard/traffic") as Promise<Feed<TrafficItem[]>>,
  erp: () => authed("/external/dashboard/erp") as Promise<Feed<ErpItem[]>>,
  carpark: () => authed("/external/dashboard/carpark") as Promise<Feed<CarparkItem[]>>,
  petrol: () => authed("/external/dashboard/petrol") as Promise<Feed<PetrolItem[]>>,
};

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
