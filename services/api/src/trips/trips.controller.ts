import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { TripsService } from "./trips.service";

@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.trips.listForUser(user.id);
  }

  @Get(":routeId")
  getByRoute(@CurrentUser() user: AuthUser, @Param("routeId") routeId: string) {
    return this.trips.getByRoute(user.id, routeId);
  }
}
