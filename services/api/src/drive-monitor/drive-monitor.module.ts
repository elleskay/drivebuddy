import { Module } from "@nestjs/common";
import { TripsModule } from "../trips/trips.module";
import { RoutesService } from "./routes.service";
import { RoutesController } from "./routes.controller";

@Module({
  imports: [TripsModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class DriveMonitorModule {}
