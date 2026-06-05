import { Module } from "@nestjs/common";
import { RouteAnalysisController } from "./route-analysis.controller";
import { RouteAnalysisService } from "./route-analysis.service";

@Module({
  controllers: [RouteAnalysisController],
  providers: [RouteAnalysisService],
})
export class RouteAnalysisModule {}
