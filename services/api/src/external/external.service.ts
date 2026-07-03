import { Injectable, Logger } from "@nestjs/common";
import { fetchRoute, type RoutePlan } from "./osrm";

/** Consistent envelope for every dashboard feed. */
export interface Feed<T> {
  source: string;
  lastUpdated: string;
  keyRequired?: boolean; // true when an LTA key is needed but not configured
  data: T;
}

const LTA_BASE = "https://datamall2.mytransport.sg/ltaodataservice";
const DATA_GOV = "https://api.data.gov.sg/v1/environment";

// Raw LTA DataMall record shapes (only the fields this service reads).
interface LtaTrafficIncident {
  Type: string;
  Message: string;
  Latitude: number;
  Longitude: number;
}

interface LtaErpRate {
  ZoneID: string;
  ChargeAmount: number;
  StartTime: string;
  EndTime: string;
  VehicleType: string;
}

interface LtaCarparkAvailability {
  CarParkID: string;
  Area: string;
  Development: string;
  AvailableLots: number;
  LotType: string;
}

@Injectable()
export class ExternalService {
  private readonly log = new Logger(ExternalService.name);
  private readonly cache = new Map<string, { at: number; value: unknown }>();

  private get ltaKey(): string | undefined {
    return process.env.LTA_ACCOUNT_KEY || undefined;
  }

  /** Small in-memory TTL cache; warm Lambda instances reuse it across calls. */
  private async cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
    const value = await fn();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  private async lta<T>(resource: string): Promise<T[]> {
    if (!this.ltaKey) return [];
    try {
      const res = await fetch(`${LTA_BASE}/${resource}`, {
        headers: { AccountKey: this.ltaKey, accept: "application/json" },
      });
      if (!res.ok) {
        this.log.warn(`LTA ${resource} -> ${res.status}`);
        return [];
      }
      const body = (await res.json()) as { value?: T[] };
      return body.value ?? [];
    } catch (e) {
      this.log.warn(`LTA ${resource} failed: ${String(e)}`);
      return [];
    }
  }

  async weather(): Promise<Feed<{ area: string; forecast: string }[]>> {
    const data = await this.cached("weather", 5 * 60_000, async () => {
      try {
        const res = await fetch(`${DATA_GOV}/2-hour-weather-forecast`);
        const body = (await res.json()) as {
          items?: { forecasts?: { area: string; forecast: string }[] }[];
        };
        return body.items?.[0]?.forecasts ?? [];
      } catch (e) {
        this.log.warn(`weather failed: ${String(e)}`);
        return [];
      }
    });
    return { source: "data.gov.sg", lastUpdated: new Date().toISOString(), data };
  }

  async traffic(): Promise<
    Feed<{ type: string; message: string; latitude: number; longitude: number }[]>
  > {
    const rows = await this.cached("traffic", 2 * 60_000, () =>
      this.lta<LtaTrafficIncident>("TrafficIncidents"),
    );
    return {
      source: "LTA DataMall",
      lastUpdated: new Date().toISOString(),
      keyRequired: !this.ltaKey,
      data: rows.map((r) => ({
        type: r.Type,
        message: r.Message,
        latitude: r.Latitude,
        longitude: r.Longitude,
      })),
    };
  }

  async erp(): Promise<
    Feed<
      {
        zone: string;
        chargeAmount: number;
        startTime: string;
        endTime: string;
        vehicleType: string;
      }[]
    >
  > {
    const rows = await this.cached("erp", 30 * 60_000, () => this.lta<LtaErpRate>("ERPRates"));
    return {
      source: "LTA DataMall",
      lastUpdated: new Date().toISOString(),
      keyRequired: !this.ltaKey,
      data: rows.map((r) => ({
        zone: r.ZoneID,
        chargeAmount: Number(r.ChargeAmount ?? 0),
        startTime: r.StartTime,
        endTime: r.EndTime,
        vehicleType: r.VehicleType,
      })),
    };
  }

  async carpark(): Promise<
    Feed<
      { id: string; area: string; development: string; availableLots: number; lotType: string }[]
    >
  > {
    const rows = await this.cached("carpark", 60_000, () =>
      this.lta<LtaCarparkAvailability>("CarParkAvailabilityv2"),
    );
    return {
      source: "LTA DataMall",
      lastUpdated: new Date().toISOString(),
      keyRequired: !this.ltaKey,
      data: rows.slice(0, 200).map((r) => ({
        id: r.CarParkID,
        area: r.Area,
        development: r.Development,
        availableLots: Number(r.AvailableLots ?? 0),
        lotType: r.LotType,
      })),
    };
  }

  /** Driving route + alternative between two points (keyless OSRM). */
  async route(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<Feed<RoutePlan | null>> {
    const key = `route:${fromLat},${fromLng},${toLat},${toLng}`;
    const data = await this.cached(key, 10 * 60_000, () =>
      fetchRoute(fromLat, fromLng, toLat, toLng),
    );
    return { source: "OSRM", lastUpdated: new Date().toISOString(), data };
  }

  // Petrol prices have no free public API; the .NET service shipped a static set.
  // Replace with a real feed/scraper later if needed.
  petrol(): Feed<{ brand: string; product: string; price: number }[]> {
    return {
      source: "static",
      lastUpdated: new Date().toISOString(),
      data: [
        { brand: "Shell", product: "FuelSave 95", price: 2.78 },
        { brand: "Esso", product: "Synergy 95", price: 2.79 },
        { brand: "Caltex", product: "Silver 95", price: 2.76 },
        { brand: "SPC", product: "95", price: 2.62 },
        { brand: "Sinopec", product: "95", price: 2.6 },
      ],
    };
  }
}
