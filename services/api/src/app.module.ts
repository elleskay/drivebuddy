import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { ExternalModule } from "./external/external.module";

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, UsersModule, VehiclesModule, ExternalModule],
})
export class AppModule {}
