import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { RoutesService } from "./routes.service";
import { AddPointsDto, StartRouteDto } from "./dto";

@Controller("drive-monitor/routes")
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Post()
  start(@CurrentUser() user: AuthUser, @Body() dto: StartRouteDto) {
    return this.routes.start(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.routes.list(user.id);
  }

  @Get("active")
  active(@CurrentUser() user: AuthUser) {
    return this.routes.getActive(user.id);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.routes.getOne(user.id, id);
  }

  @Post(":id/points")
  addPoints(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AddPointsDto) {
    return this.routes.addPoints(user.id, id, dto);
  }

  @Post(":id/complete")
  complete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.routes.complete(user.id, id);
  }
}
