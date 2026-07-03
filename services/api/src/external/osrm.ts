// Keyless driving-route lookup via the public OSRM demo server. Used to suggest
// a primary route and an alternative for a driver's usual trip. OSRM's demo host
// is rate-limited and best-effort (fine for a student/demo project); swap in a
// self-hosted OSRM or a keyed provider for production.

const OSRM = "https://router.project-osrm.org/route/v1/driving";

export interface RouteOption {
  distanceKm: number;
  durationMin: number;
}
export interface RoutePlan {
  primary: RouteOption;
  alternative?: RouteOption;
}

function toOption(r: { distance: number; duration: number }): RouteOption {
  return {
    distanceKm: Math.round(r.distance / 100) / 10,
    durationMin: Math.round(r.duration / 60),
  };
}

/** Fetch the fastest driving route (and an alternative, if any) between two points. */
export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RoutePlan | null> {
  try {
    const url = `${OSRM}/${fromLng},${fromLat};${toLng},${toLat}?overview=false&alternatives=true`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DriveBuddy/1.0 (+https://github.com/elleskay/drivebuddy)" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      code?: string;
      routes?: { distance: number; duration: number }[];
    };
    if (body.code !== "Ok" || !body.routes?.length) return null;
    return {
      primary: toOption(body.routes[0]!),
      alternative: body.routes[1] ? toOption(body.routes[1]) : undefined,
    };
  } catch {
    return null;
  }
}
