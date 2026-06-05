export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed?: number | null;
}

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Total distance (km), average + max speed (km/h) over an ordered point list. */
export function routeStats(points: GpsPoint[]): {
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
} {
  if (points.length < 2) {
    const max = points[0]?.speed ?? 0;
    return { totalDistance: 0, averageSpeed: 0, maxSpeed: max ? max * 3.6 : 0 };
  }
  let dist = 0;
  let maxSpeedMs = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    dist += haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    if (b.speed && b.speed > maxSpeedMs) maxSpeedMs = b.speed;
  }
  const durationH =
    (points[points.length - 1]!.timestamp.getTime() - points[0]!.timestamp.getTime()) / 3_600_000;
  const averageSpeed = durationH > 0 ? dist / durationH : 0;
  return {
    totalDistance: dist,
    averageSpeed,
    maxSpeed: maxSpeedMs * 3.6, // m/s -> km/h
  };
}
