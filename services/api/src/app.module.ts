import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { ExternalModule } from "./external/external.module";
import { TripsModule } from "./trips/trips.module";
import { DriveMonitorModule } from "./drive-monitor/drive-monitor.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AiModule } from "./ai/ai.module";
import { RouteAnalysisModule } from "./route-analysis/route-analysis.module";

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
    NotificationsModule,
    AiModule,
    RouteAnalysisModule,
  ],
})
export class AppModule {}
