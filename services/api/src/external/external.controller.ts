import { Controller, Get } from "@nestjs/common";
import { ExternalService } from "./external.service";

/**
 * Public Singapore live-data feeds for the dashboard. No auth — these are public
 * reference data. Weather/petrol work out of the box; traffic/ERP/carpark return
 * empty with keyRequired:true until LTA_ACCOUNT_KEY is configured.
 */
@Controller("external")
export class ExternalController {
  constructor(private readonly external: ExternalService) {}

  @Get("dashboard/weather")
  weather() {
    return this.external.weather();
  }

  @Get("dashboard/traffic")
  traffic() {
    return this.external.traffic();
  }

  @Get("dashboard/erp")
  erp() {
    return this.external.erp();
  }

  @Get("dashboard/carpark")
  carpark() {
    return this.external.carpark();
  }

  @Get("dashboard/petrol")
  petrol() {
    return this.external.petrol();
  }
}
