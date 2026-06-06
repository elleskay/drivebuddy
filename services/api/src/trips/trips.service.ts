import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { estimateErpCost } from "../external/erp-gantries";

// Indicative unit prices (SGD). Petrol/Hybrid use $/litre, Electric $/kWh.
const FUEL_PRICE: Record<string, number> = { Petrol: 2.78, Hybrid: 2.78, Electric: 0.55 };

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Build (or refresh) the cost summary for a completed route. */
  async createForRoute(userId: string, routeId: string) {
    const route = await this.prisma.drivingRoute.findFirst({
      where: { id: routeId, userId },
      include: {
        points: { orderBy: { timestamp: "asc" } },
        user: { include: { vehicles: { where: { isMain: true }, take: 1 } } },
      },
    });
    if (!route) throw new NotFoundException("Route not found");

    const first = route.points[0];
    const last = route.points[route.points.length - 1];
    const end = route.endTime ?? new Date();
    const durationMin = Math.max(0, Math.round((end.getTime() - route.startTime.getTime()) / 60_000));

    // Fuel cost from the main vehicle's consumption over the distance.
    const vehicle = route.user.vehicles[0];
    let fuelCost = 0;
    if (vehicle) {
      const consumption = Number(vehicle.fuelConsumption); // per 100km
      const price = FUEL_PRICE[vehicle.fuelType] ?? 2.78;
      fuelCost = (route.totalDistance / 100) * consumption * price;
    }

    // ERP cost: detect which gantries the GPS trace passed and price each by the
    // charge window at the time of passing (0 outside operating hours / weekends).
    const erp = estimateErpCost(
      route.points.map((p) => ({ latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp })),
    );
    if (erp.passes.length) {
      this.logger.log(
        `Route ${routeId}: passed ${erp.passes.length} ERP gantr${erp.passes.length > 1 ? "ies" : "y"} ` +
          `($${erp.cost.toFixed(2)}): ${erp.passes.map((p) => `${p.name} $${p.charge.toFixed(2)}`).join(", ")}`,
      );
    }

    const data = {
      userId,
      routeName: route.name,
      distanceKm: route.totalDistance,
      durationMin,
      startTime: route.startTime,
      endTime: end,
      startLat: first?.latitude ?? null,
      startLng: first?.longitude ?? null,
      endLat: last?.latitude ?? null,
      endLng: last?.longitude ?? null,
      fuelCost: new Prisma.Decimal(fuelCost.toFixed(2)),
      erpCost: new Prisma.Decimal(erp.cost.toFixed(2)),
      parkingCost: new Prisma.Decimal(0),
    };

    const summary = await this.prisma.tripSummary.upsert({
      where: { routeId },
      create: { routeId, ...data },
      update: data,
    });

    // Maintenance reminder: fire once each time the driver's cumulative mileage
    // crosses a service interval. Comparing pre/post cumulative makes it
    // self-deduplicating (a re-complete of the same route doesn't re-fire).
    const SERVICE_INTERVAL_KM = 10_000;
    const agg = await this.prisma.tripSummary.aggregate({
      where: { userId },
      _sum: { distanceKm: true },
    });
    const cumulative = agg._sum.distanceKm ?? 0;
    const prev = cumulative - summary.distanceKm;
    let maintenanceDueKm: number | null = null;
    if (Math.floor(prev / SERVICE_INTERVAL_KM) < Math.floor(cumulative / SERVICE_INTERVAL_KM)) {
      maintenanceDueKm = Math.floor(cumulative / SERVICE_INTERVAL_KM) * SERVICE_INTERVAL_KM;
    }

    return { summary, maintenanceDueKm };
  }

  listForUser(userId: string) {
    return this.prisma.tripSummary.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  async getByRoute(userId: string, routeId: string) {
    const trip = await this.prisma.tripSummary.findFirst({ where: { routeId, userId } });
    if (!trip) throw new NotFoundException("Trip summary not found");
    return trip;
  }
}
