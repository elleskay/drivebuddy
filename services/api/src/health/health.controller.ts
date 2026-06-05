import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  // Liveness probe hit by the post-deploy smoke test (scripts/verify-deploy.sh)
  // and by the load balancer / API gateway health check.
  @Get("health")
  health(): { status: "ok"; service: string; time: string } {
    return {
      status: "ok",
      service: process.env.DD_SERVICE ?? "drivebuddy-api",
      time: new Date().toISOString(),
    };
  }
}
