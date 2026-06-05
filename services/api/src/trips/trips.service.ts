import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

// Indicative unit prices (SGD). Petrol/Hybrid use $/litre, Electric $/kWh.
const FUEL_PRICE: Record<string, number> = { Petrol: 2.78, Hybrid: 2.78, Electric: 0.55 };

@Injectable()
export class TripsService {
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
      erpCost: new Prisma.Decimal(0), // wired to the external ERP module later
      parkingCost: new Prisma.Decimal(0),
    };

    return this.prisma.tripSummary.upsert({
      where: { routeId },
      create: { routeId, ...data },
      update: data,
    });
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
