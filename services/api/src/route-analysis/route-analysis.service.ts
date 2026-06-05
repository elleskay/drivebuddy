import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { computeInsights, generateForUser } from "./analysis";

@Injectable()
export class RouteAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async insights(userId: string) {
    const trips = await this.prisma.tripSummary.findMany({ where: { userId } });
    return computeInsights(trips);
  }

  listRecommendations(userId: string) {
    return this.prisma.recommendation.findMany({
      where: { userId, dismissed: false },
      orderBy: { score: "desc" },
    });
  }

  /** Recompute now, then return the live list. */
  async refresh(userId: string) {
    await generateForUser(this.prisma, userId);
    return this.listRecommendations(userId);
  }

  async dismiss(userId: string, id: string) {
    const res = await this.prisma.recommendation.updateMany({
      where: { id, userId },
      data: { dismissed: true },
    });
    if (res.count === 0) throw new NotFoundException("Recommendation not found");
    return { ok: true };
  }
}
