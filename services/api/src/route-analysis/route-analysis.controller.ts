import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { RouteAnalysisService } from "./route-analysis.service";

@Controller("route-analysis")
@UseGuards(JwtAuthGuard)
export class RouteAnalysisController {
  constructor(private readonly analysis: RouteAnalysisService) {}

  @Get("insights")
  insights(@CurrentUser() user: AuthUser) {
    return this.analysis.insights(user.id);
  }

  @Get("recommendations")
  list(@CurrentUser() user: AuthUser) {
    return this.analysis.listRecommendations(user.id);
  }

  @Post("recommendations/refresh")
  refresh(@CurrentUser() user: AuthUser) {
    return this.analysis.refresh(user.id);
  }

  @Post("recommendations/:id/dismiss")
  dismiss(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.analysis.dismiss(user.id, id);
  }
}
