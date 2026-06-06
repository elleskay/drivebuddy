import type { PrismaClient, TripSummary } from "@prisma/client";

export interface Insights {
  totalTrips: number;
  totalDistanceKm: number;
  totalCost: number;
  avgCostPerTrip: number;
  avgDistanceKm: number;
  last7: { trips: number; cost: number };
  prev7: { trips: number; cost: number };
  peakHour: number | null; // 0-23, most common departure hour
  busiestDay: string | null; // Mon..Sun
  erpPeakTrips: number; // trips departing during ERP peak windows
  topDestinations: { label: string; lat: number; lng: number; count: number }[];
  recentDistanceKm: number; // distance driven in the last 14 days
  crossesCauseway: string | null; // "Woodlands" | "Tuas" if drives reach a checkpoint
}

export interface RecommendationDraft {
  category: "erp" | "fuel" | "routine" | "safety" | "carpark";
  title: string;
  body: string;
  score: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// SG-Malaysia land checkpoints. A drive ending near one means the driver heads
// to/from Johor via the Causeway (Woodlands) or Second Link (Tuas).
const CHECKPOINTS = [
  { name: "Woodlands", lat: 1.4467, lng: 103.7686 },
  { name: "Tuas", lat: 1.3482, lng: 103.6361 },
];
const CHECKPOINT_RADIUS_KM = 3;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function cost(t: TripSummary): number {
  return Number(t.fuelCost) + Number(t.erpCost) + Number(t.parkingCost);
}

// Weekday ERP-ish peak windows (local SGT ~ UTC+8). We store UTC timestamps, so
// translate to SGT by adding 8h when reading the hour.
function sgtHour(d: Date): number {
  return (d.getUTCHours() + 8) % 24;
}
function isErpPeak(d: Date): boolean {
  const day = (d.getUTCDay() + (d.getUTCHours() + 8 >= 24 ? 1 : 0)) % 7; // approx day in SGT
  const h = sgtHour(d);
  const weekday = day >= 1 && day <= 5;
  return weekday && ((h >= 7 && h < 10) || (h >= 17 && h < 20));
}

export function computeInsights(trips: TripSummary[]): Insights {
  const totalTrips = trips.length;
  const totalDistanceKm = trips.reduce((s, t) => s + t.distanceKm, 0);
  const totalCost = trips.reduce((s, t) => s + cost(t), 0);

  const now = Date.now();
  const DAY = 86_400_000;
  const inWindow = (t: TripSummary, from: number, to: number) => {
    const ts = t.startTime.getTime();
    return ts >= from && ts < to;
  };
  const last7Trips = trips.filter((t) => inWindow(t, now - 7 * DAY, now));
  const prev7Trips = trips.filter((t) => inWindow(t, now - 14 * DAY, now - 7 * DAY));
  const recentDistanceKm = trips
    .filter((t) => inWindow(t, now - 14 * DAY, now))
    .reduce((s, t) => s + t.distanceKm, 0);

  const hourCounts = new Array(24).fill(0) as number[];
  const dayCounts = new Array(7).fill(0) as number[];
  let erpPeakTrips = 0;
  const destBuckets = new Map<string, { lat: number; lng: number; count: number }>();
  const checkpointHits = new Map<string, number>();

  for (const t of trips) {
    const h = sgtHour(t.startTime);
    const d = t.startTime.getUTCDay();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    dayCounts[d] = (dayCounts[d] ?? 0) + 1;
    if (isErpPeak(t.startTime)) erpPeakTrips++;
    if (t.endLat != null && t.endLng != null) {
      const key = `${t.endLat.toFixed(2)},${t.endLng.toFixed(2)}`;
      const b = destBuckets.get(key) ?? { lat: t.endLat, lng: t.endLng, count: 0 };
      b.count++;
      destBuckets.set(key, b);
    }
    // Causeway/Second Link detection: trip start OR end near a checkpoint.
    for (const cp of CHECKPOINTS) {
      const nearEnd = t.endLat != null && t.endLng != null && haversineKm(cp.lat, cp.lng, t.endLat, t.endLng) <= CHECKPOINT_RADIUS_KM;
      const nearStart = t.startLat != null && t.startLng != null && haversineKm(cp.lat, cp.lng, t.startLat, t.startLng) <= CHECKPOINT_RADIUS_KM;
      if (nearEnd || nearStart) checkpointHits.set(cp.name, (checkpointHits.get(cp.name) ?? 0) + 1);
    }
  }

  const crossesCauseway =
    [...checkpointHits.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const peakHour = totalTrips ? hourCounts.indexOf(Math.max(...hourCounts)) : null;
  const busiestDay = totalTrips ? DAYS[dayCounts.indexOf(Math.max(...dayCounts))]! : null;
  const topDestinations = [...destBuckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((d) => ({ label: `${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}`, lat: d.lat, lng: d.lng, count: d.count }));

  return {
    totalTrips,
    totalDistanceKm,
    totalCost,
    avgCostPerTrip: totalTrips ? totalCost / totalTrips : 0,
    avgDistanceKm: totalTrips ? totalDistanceKm / totalTrips : 0,
    last7: { trips: last7Trips.length, cost: last7Trips.reduce((s, t) => s + cost(t), 0) },
    prev7: { trips: prev7Trips.length, cost: prev7Trips.reduce((s, t) => s + cost(t), 0) },
    peakHour,
    busiestDay,
    erpPeakTrips,
    topDestinations,
    recentDistanceKm,
    crossesCauseway,
  };
}

/** Derive grounded suggestions from the computed insights (no fabricated data). */
export function buildRecommendations(i: Insights): RecommendationDraft[] {
  const recs: RecommendationDraft[] = [];
  if (i.totalTrips < 2) return recs; // not enough history to be useful yet

  if (i.erpPeakTrips >= 2) {
    const share = Math.round((i.erpPeakTrips / i.totalTrips) * 100);
    recs.push({
      category: "erp",
      title: "Beat the ERP peak",
      body: `${share}% of your drives (${i.erpPeakTrips}) start during ERP peak hours. Leaving ~30 min earlier or later could cut gantry charges.`,
      score: 80 + share / 10,
    });
  }

  if (i.avgCostPerTrip > 0) {
    recs.push({
      category: "fuel",
      title: "Your average trip cost",
      body: `You spend about $${i.avgCostPerTrip.toFixed(2)} per drive ($${i.totalCost.toFixed(2)} over ${i.totalTrips} trips). Smoother acceleration and steady speeds help reduce fuel use.`,
      score: 50,
    });
  }

  const top = i.topDestinations[0];
  if (top && top.count >= 3) {
    recs.push({
      category: "routine",
      title: "Frequent destination",
      body: `You've driven to around ${top.label} ${top.count} times. Save it as a favourite for quicker route checks.`,
      score: 65,
    });
  }

  if (i.peakHour != null && i.busiestDay) {
    recs.push({
      category: "routine",
      title: "Your driving routine",
      body: `You drive most on ${i.busiestDay}s, usually around ${formatHour(i.peakHour)}. Check live traffic before you leave.`,
      score: 40,
    });
  }

  if (i.last7.trips > i.prev7.trips && i.prev7.trips > 0) {
    recs.push({
      category: "carpark",
      title: "Busier week on the road",
      body: `You drove ${i.last7.trips} times this week vs ${i.prev7.trips} last week. Plan parking ahead - check live carpark availability at peak times.`,
      score: 45,
    });
  }

  // Causeway / Second Link crossing: surface checkpoint-traffic guidance.
  if (i.crossesCauseway) {
    const other = i.crossesCauseway === "Woodlands" ? "Tuas (Second Link)" : "Woodlands (Causeway)";
    recs.push({
      category: "routine",
      title: "Causeway crossing",
      body: `Some of your drives reach the ${i.crossesCauseway} checkpoint. Check live checkpoint traffic before you set off - if it's jammed, ${other} or an off-peak departure can be much faster.`,
      score: 72,
    });
  }

  // Refuelling nudge: distance-based, since refuel events aren't tracked. ~350km
  // is a rough sedan tank range, so this surfaces when a fill-up is likely due.
  if (i.recentDistanceKm >= 350) {
    recs.push({
      category: "fuel",
      title: "Fuel check",
      body: `You've driven about ${i.recentDistanceKm.toFixed(0)} km in the last two weeks - a refuel may be due soon. Compare 95 petrol prices on the dashboard before your next fill-up.`,
      score: 58,
    });
  }

  // Carpark routine: tie a parking tip to the most frequent destination.
  const topDest = i.topDestinations[0];
  if (topDest && topDest.count >= 2) {
    recs.push({
      category: "carpark",
      title: "Parking at your usual spot",
      body: `You often park near ${topDest.label} (${topDest.count} visits). Check live carpark availability there before arriving, or pick a nearby carpark with more free lots.`,
      score: 48,
    });
  }

  return recs.sort((a, b) => b.score - a.score);
}

function formatHour(h: number): string {
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${am ? "am" : "pm"}`;
}

/**
 * Recompute a user's recommendations. Replaces their non-dismissed rows with a
 * fresh set, skipping any draft the user has already dismissed (by category+title).
 * Returns the recommendations created.
 */
export async function generateForUser(prisma: PrismaClient, userId: string) {
  const trips = await prisma.tripSummary.findMany({ where: { userId } });
  const drafts = buildRecommendations(computeInsights(trips));

  const dismissed = await prisma.recommendation.findMany({
    where: { userId, dismissed: true },
    select: { category: true, title: true },
  });
  const tombstones = new Set(dismissed.map((d) => `${d.category}|${d.title}`));
  const fresh = drafts.filter((d) => !tombstones.has(`${d.category}|${d.title}`));

  await prisma.recommendation.deleteMany({ where: { userId, dismissed: false } });
  if (fresh.length) {
    await prisma.recommendation.createMany({
      data: fresh.map((d) => ({ userId, category: d.category, title: d.title, body: d.body, score: d.score })),
    });
  }
  return fresh;
}
