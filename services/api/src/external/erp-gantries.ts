import { haversineKm } from "../common/geo";

// Static ERP gantry reference data for cost estimation.
//
// The LTA DataMall ERPRates feed gives charge amounts by zone/time but NOT the
// gantry coordinates needed to tell whether a recorded drive actually passed
// one. This is a curated set of major Singapore gantries with approximate
// coordinates and a typical passenger-car peak charge, used to detect
// pass-throughs from a route's GPS trace and estimate the ERP cost of a trip.
//
// Coordinates and charges are approximate (ERP rates are revised quarterly and
// vary in fine 5-30 min steps); this yields a realistic estimate, not a billing
// figure. When the live ERPRates feed is wired in, per-gantry charges can be
// refined from it.

export interface ErpGantry {
  id: string;
  name: string;
  lat: number;
  lng: number;
  peakCharge: number; // typical passenger-car charge during peak (SGD)
}

export const ERP_GANTRIES: ErpGantry[] = [
  { id: "CTE-BRADDELL", name: "CTE (Braddell)", lat: 1.3416, lng: 103.847, peakCharge: 2.0 },
  { id: "CTE-MOULMEIN", name: "CTE (Moulmein)", lat: 1.321, lng: 103.843, peakCharge: 3.0 },
  { id: "CTE-CHINSWEE", name: "CTE (Chin Swee)", lat: 1.2895, lng: 103.838, peakCharge: 3.0 },
  { id: "PIE-MTPLEASANT", name: "PIE (Mount Pleasant)", lat: 1.327, lng: 103.839, peakCharge: 1.0 },
  { id: "PIE-EUNOS", name: "PIE (Eunos)", lat: 1.319, lng: 103.903, peakCharge: 1.0 },
  { id: "PIE-KALLANG", name: "PIE (Kallang Bahru)", lat: 1.3215, lng: 103.871, peakCharge: 1.0 },
  { id: "ECP-TGRHU", name: "ECP (Tanjong Rhu)", lat: 1.296, lng: 103.872, peakCharge: 2.0 },
  { id: "ECP-CITY", name: "ECP (city-bound)", lat: 1.299, lng: 103.887, peakCharge: 2.0 },
  { id: "AYE-ALEXANDRA", name: "AYE (Alexandra)", lat: 1.279, lng: 103.805, peakCharge: 2.0 },
  { id: "KPE-SOUTH", name: "KPE (southbound)", lat: 1.316, lng: 103.887, peakCharge: 1.0 },
  { id: "ORCHARD", name: "Orchard cordon", lat: 1.304, lng: 103.832, peakCharge: 2.0 },
  { id: "BENCOOLEN", name: "Bencoolen St", lat: 1.299, lng: 103.852, peakCharge: 2.0 },
  { id: "NTHBRIDGE", name: "North Bridge Rd", lat: 1.296, lng: 103.856, peakCharge: 1.0 },
  { id: "OUTRAM", name: "Outram (cordon)", lat: 1.281, lng: 103.839, peakCharge: 2.0 },
  { id: "FARRER", name: "Farrer Rd", lat: 1.3175, lng: 103.807, peakCharge: 1.0 },
];

const DETECT_RADIUS_KM = 0.15; // ~150m: GPS-sample vicinity of a gantry

// ERP only charges inside operating windows. Approximate the passenger-car
// schedule: weekday peaks charge full, the shoulders around them charge a
// fraction, and everything else (incl. weekends and late night) is free.
function chargeMultiplier(at: Date): number {
  const sgt = new Date(at.getTime() + 8 * 3_600_000);
  const day = sgt.getUTCDay(); // 0 Sun .. 6 Sat (SGT)
  if (day === 0 || day === 6) return 0; // ERP largely off on weekends
  const h = sgt.getUTCHours();
  const m = sgt.getUTCMinutes();
  const t = h + m / 60;
  const peak = (t >= 7.5 && t < 9.5) || (t >= 17.5 && t < 20); // morning / evening peak
  if (peak) return 1;
  const shoulder = (t >= 6 && t < 7.5) || (t >= 9.5 && t < 10.5) || (t >= 17 && t < 17.5);
  if (shoulder) return 0.4;
  return 0;
}

export interface ErpPass {
  id: string;
  name: string;
  charge: number;
  at: string; // ISO time of the closest GPS sample
}

export interface ErpEstimate {
  cost: number;
  passes: ErpPass[];
}

/**
 * Detect which ERP gantries a recorded route passed (a GPS sample within
 * ~150m), price each by the charge window at the time of passing, and sum.
 * Each gantry is counted at most once per trip.
 */
export function estimateErpCost(
  points: { latitude: number; longitude: number; timestamp: Date }[],
): ErpEstimate {
  const passes: ErpPass[] = [];
  for (const g of ERP_GANTRIES) {
    let nearest: { d: number; at: Date } | null = null;
    for (const p of points) {
      const d = haversineKm(g.lat, g.lng, p.latitude, p.longitude);
      if (d <= DETECT_RADIUS_KM && (!nearest || d < nearest.d)) {
        nearest = { d, at: p.timestamp };
      }
    }
    if (!nearest) continue;
    const charge = Math.round(g.peakCharge * chargeMultiplier(nearest.at) * 100) / 100;
    if (charge > 0) passes.push({ id: g.id, name: g.name, charge, at: nearest.at.toISOString() });
  }
  const cost = Math.round(passes.reduce((s, p) => s + p.charge, 0) * 100) / 100;
  return { cost, passes };
}
