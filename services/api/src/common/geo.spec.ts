import { describe, expect, test } from "vitest";
import { haversineKm, routeStats } from "./geo";

describe("haversineKm", () => {
  test("zero distance for identical points", () => {
    expect(haversineKm(1.3521, 103.8198, 1.3521, 103.8198)).toBe(0);
  });

  test("one degree of longitude at the equator is ~111.19 km", () => {
    expect(haversineKm(0, 0, 0, 1)).toBeCloseTo(111.19, 1);
  });

  test("is symmetric", () => {
    const ab = haversineKm(1.3416, 103.847, 1.281, 103.839);
    const ba = haversineKm(1.281, 103.839, 1.3416, 103.847);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe("routeStats", () => {
  const at = (secs: number) => new Date(Date.UTC(2026, 5, 30, 0, 0, secs));

  test("fewer than two points yields zero distance and speed", () => {
    expect(routeStats([])).toEqual({ totalDistance: 0, averageSpeed: 0, maxSpeed: 0 });
    const single = routeStats([{ latitude: 1.3, longitude: 103.8, timestamp: at(0), speed: 10 }]);
    expect(single.totalDistance).toBe(0);
    expect(single.maxSpeed).toBeCloseTo(36, 5); // 10 m/s -> km/h
  });

  test("sums segment distances and derives average speed from duration", () => {
    // ~1.11 km due north over 60 seconds -> ~66.7 km/h average.
    const points = [
      { latitude: 1.3, longitude: 103.8, timestamp: at(0), speed: 5 },
      { latitude: 1.31, longitude: 103.8, timestamp: at(60), speed: 20 },
    ];
    const stats = routeStats(points);
    expect(stats.totalDistance).toBeCloseTo(1.112, 2);
    expect(stats.averageSpeed).toBeCloseTo(stats.totalDistance * 60, 5);
    expect(stats.maxSpeed).toBeCloseTo(72, 5); // 20 m/s -> km/h
  });
});
