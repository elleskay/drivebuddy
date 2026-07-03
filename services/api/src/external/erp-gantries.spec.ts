import { describe, expect, test } from "vitest";
import { ERP_GANTRIES, estimateErpCost } from "./erp-gantries";

// 2026-06-30 is a Tuesday. SGT = UTC+8, so 00:00 UTC is 08:00 SGT (morning peak).
const TUE_PEAK = new Date("2026-06-30T00:00:00Z"); // 08:00 SGT Tuesday
const TUE_NIGHT = new Date("2026-06-30T15:00:00Z"); // 23:00 SGT Tuesday
const SUN_PEAK = new Date("2026-06-28T00:00:00Z"); // 08:00 SGT Sunday

const braddell = ERP_GANTRIES.find((g) => g.id === "CTE-BRADDELL")!;
const pointAt = (timestamp: Date) => ({
  latitude: braddell.lat,
  longitude: braddell.lng,
  timestamp,
});

describe("estimateErpCost", () => {
  test("charges the full peak rate for a weekday-peak pass", () => {
    const { cost, passes } = estimateErpCost([pointAt(TUE_PEAK)]);
    expect(passes).toHaveLength(1);
    expect(passes[0]!.id).toBe("CTE-BRADDELL");
    expect(cost).toBeCloseTo(braddell.peakCharge, 2);
  });

  test("charges nothing late at night", () => {
    expect(estimateErpCost([pointAt(TUE_NIGHT)])).toEqual({ cost: 0, passes: [] });
  });

  test("charges nothing on weekends", () => {
    expect(estimateErpCost([pointAt(SUN_PEAK)])).toEqual({ cost: 0, passes: [] });
  });

  test("counts a gantry at most once per trip", () => {
    const { passes } = estimateErpCost([
      pointAt(TUE_PEAK),
      pointAt(new Date(TUE_PEAK.getTime() + 60_000)),
    ]);
    expect(passes).toHaveLength(1);
  });

  test("ignores points far from every gantry", () => {
    const farAway = { latitude: 1.45, longitude: 103.75, timestamp: TUE_PEAK };
    expect(estimateErpCost([farAway]).passes).toHaveLength(0);
  });
});
