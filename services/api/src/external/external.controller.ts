import { Controller, Get, Query } from "@nestjs/common";
import { ExternalService } from "./external.service";
import { ERP_GANTRIES } from "./erp-gantries";

/**
 * Public Singapore live-data feeds for the dashboard. No auth - these are public
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

  /** ERP gantry coordinates for in-drive proximity alerts (public reference data). */
  @Get("erp-gantries")
  erpGantries() {
    return ERP_GANTRIES.map(({ id, name, lat, lng }) => ({ id, name, lat, lng }));
  }

  /** Driving route + alternative between two points (keyless OSRM). */
  @Get("route")
  route(
    @Query("fromLat") fromLat: string,
    @Query("fromLng") fromLng: string,
    @Query("toLat") toLat: string,
    @Query("toLng") toLng: string,
  ) {
    return this.external.route(Number(fromLat), Number(fromLng), Number(toLat), Number(toLng));
  }
}
