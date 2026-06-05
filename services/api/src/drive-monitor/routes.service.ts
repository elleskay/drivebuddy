import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TripsService } from "../trips/trips.service";
import { NotificationsService } from "../notifications/notifications.service";
import { routeStats } from "./geo";
import { AddPointsDto, StartRouteDto } from "./dto";

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Start a new active route, deactivating any previously-active one. */
  async start(userId: string, dto: StartRouteDto) {
    await this.prisma.drivingRoute.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endTime: new Date() },
    });
    return this.prisma.drivingRoute.create({
      data: { userId, name: dto.name, isActive: true },
    });
  }

  /** Append GPS samples to a route and recompute its stats. */
  async addPoints(userId: string, routeId: string, dto: AddPointsDto) {
    const route = await this.prisma.drivingRoute.findFirst({ where: { id: routeId, userId } });
    if (!route) throw new NotFoundException("Route not found");

    await this.prisma.routePoint.createMany({
      data: dto.points.map((p) => ({
        routeId,
        timestamp: new Date(p.timestamp),
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude ?? null,
        speed: p.speed ?? null,
        accuracy: p.accuracy ?? null,
      })),
    });

    const all = await this.prisma.routePoint.findMany({
      where: { routeId },
      orderBy: { timestamp: "asc" },
      select: { latitude: true, longitude: true, timestamp: true, speed: true },
    });
    const stats = routeStats(all);
    return this.prisma.drivingRoute.update({
      where: { id: routeId },
      data: {
        totalDistance: stats.totalDistance,
        averageSpeed: stats.averageSpeed,
        maxSpeed: stats.maxSpeed,
      },
    });
  }

  /** End the route and generate its trip summary. */
  async complete(userId: string, routeId: string) {
    const route = await this.prisma.drivingRoute.findFirst({ where: { id: routeId, userId } });
    if (!route) throw new NotFoundException("Route not found");
    await this.prisma.drivingRoute.update({
      where: { id: routeId },
      data: { isActive: false, endTime: route.endTime ?? new Date() },
    });
    const summary = await this.trips.createForRoute(userId, routeId);

    // Notify the driver their post-trip summary is ready (honours settings; the
    // worker fans it out to push). Best-effort — never fail completion on this.
    const totalCost = Number(summary.fuelCost) + Number(summary.erpCost) + Number(summary.parkingCost);
    await this.notifications
      .create(userId, {
        type: "POST_TRIP",
        title: "Trip complete 🚗",
        body: `${summary.distanceKm.toFixed(1)} km · ${summary.durationMin} min · $${totalCost.toFixed(2)}`,
        data: { routeId },
      })
      .catch(() => undefined);

    return { route: await this.getOne(userId, routeId), summary };
  }

  list(userId: string) {
    return this.prisma.drivingRoute.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
    });
  }

  getActive(userId: string) {
    return this.prisma.drivingRoute.findFirst({ where: { userId, isActive: true } });
  }

  async getOne(userId: string, id: string) {
    const route = await this.prisma.drivingRoute.findFirst({ where: { id, userId } });
    if (!route) throw new NotFoundException("Route not found");
    const points = await this.prisma.routePoint.findMany({
      where: { routeId: id },
      orderBy: { timestamp: "asc" },
      select: { latitude: true, longitude: true, timestamp: true, speed: true, altitude: true },
    });
    return { ...route, points };
  }
}
