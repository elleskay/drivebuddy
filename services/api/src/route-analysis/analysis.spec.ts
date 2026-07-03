import { describe, expect, test } from "vitest";
import type { TripSummary } from "@prisma/client";
import { computeInsights } from "./analysis";

const DAY = 86_400_000;

interface TripSeed {
  distanceKm?: number;
  fuelCost?: number;
  erpCost?: number;
  parkingCost?: number;
  startTime: Date;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}

// Only the fields computeInsights reads; the rest of the Prisma model is irrelevant here.
function trip(seed: TripSeed): TripSummary {
  return {
    distanceKm: 10,
    fuelCost: 3,
    erpCost: 1,
    parkingCost: 0,
    startLat: null,
    startLng: null,
    endLat: null,
    endLng: null,
    ...seed,
  } as unknown as TripSummary;
}

// 2026-06-30 was a Tuesday; 00:00 UTC = 08:00 SGT (inside the ERP morning peak).
const TUE_8AM_SGT = new Date("2026-06-30T00:00:00Z");
const TUE_11PM_SGT = new Date("2026-06-30T15:00:00Z");

describe("computeInsights", () => {
  test("returns zeroed insights for no trips", () => {
    const i = computeInsights([]);
    expect(i.totalTrips).toBe(0);
    expect(i.totalCost).toBe(0);
    expect(i.peakHour).toBeNull();
    expect(i.busiestDay).toBeNull();
    expect(i.topTrip).toBeNull();
  });

  test("aggregates totals and averages", () => {
    const trips = [
      trip({ startTime: TUE_8AM_SGT, distanceKm: 10, fuelCost: 3, erpCost: 2, parkingCost: 1 }),
      trip({ startTime: TUE_11PM_SGT, distanceKm: 30, fuelCost: 9, erpCost: 0, parkingCost: 0 }),
    ];
    const i = computeInsights(trips);
    expect(i.totalTrips).toBe(2);
    expect(i.totalDistanceKm).toBe(40);
    expect(i.totalCost).toBe(15);
    expect(i.avgCostPerTrip).toBe(7.5);
    expect(i.avgDistanceKm).toBe(20);
  });

  test("counts ERP-peak departures and finds the peak hours (SGT)", () => {
    const trips = [
      trip({ startTime: TUE_8AM_SGT }),
      trip({ startTime: TUE_8AM_SGT }),
      trip({ startTime: TUE_11PM_SGT }),
    ];
    const i = computeInsights(trips);
    expect(i.erpPeakTrips).toBe(2); // the two 08:00 SGT weekday departures
    expect(i.peakHour).toBe(8);
    expect(i.morningPeakHour).toBe(8);
    expect(i.eveningPeakHour).toBe(23);
  });

  test("splits trips into last-7-day and previous-7-day windows", () => {
    const now = Date.now();
    const trips = [
      trip({ startTime: new Date(now - 1 * DAY), fuelCost: 5, erpCost: 0, parkingCost: 0 }),
      trip({ startTime: new Date(now - 10 * DAY), fuelCost: 7, erpCost: 0, parkingCost: 0 }),
      trip({ startTime: new Date(now - 30 * DAY) }),
    ];
    const i = computeInsights(trips);
    expect(i.last7).toEqual({ trips: 1, cost: 5 });
    expect(i.prev7).toEqual({ trips: 1, cost: 7 });
    expect(i.recentDistanceKm).toBe(20); // the two trips inside 14 days
  });

  test("detects Causeway runs and the most frequent trip pair", () => {
    const pair = { startLat: 1.3, startLng: 103.8, endLat: 1.4467, endLng: 103.7686 }; // ends at Woodlands
    const trips = [
      trip({ startTime: TUE_8AM_SGT, ...pair }),
      trip({ startTime: TUE_11PM_SGT, ...pair }),
    ];
    const i = computeInsights(trips);
    expect(i.crossesCauseway).toBe("Woodlands");
    expect(i.topTrip).toEqual({
      fromLat: pair.startLat,
      fromLng: pair.startLng,
      toLat: pair.endLat,
      toLng: pair.endLng,
      count: 2,
    });
    expect(i.topDestinations[0]).toMatchObject({ count: 2 });
  });
});
