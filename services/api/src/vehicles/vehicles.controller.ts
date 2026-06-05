import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleDto, UpdateVehicleDto } from "./dto/vehicle.dto";

@Controller("vehicles")
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.vehicles.list(user.id);
  }

  @Get("main")
  getMain(@CurrentUser() user: AuthUser) {
    return this.vehicles.getMain(user.id);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.vehicles.get(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user.id, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(user.id, id, dto);
  }

  @Post(":id/set-main")
  setMain(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.vehicles.setMain(user.id, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.vehicles.remove(user.id, id);
  }
}
