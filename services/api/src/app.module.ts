import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { ExternalModule } from "./external/external.module";
import { TripsModule } from "./trips/trips.module";
import { DriveMonitorModule } from "./drive-monitor/drive-monitor.module";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    ExternalModule,
    TripsModule,
    DriveMonitorModule,
  ],
})
export class AppModule {}
