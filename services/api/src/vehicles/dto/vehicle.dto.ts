import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, MaxLength } from "class-validator";

export enum FuelType {
  Petrol = "Petrol",
  Hybrid = "Hybrid",
  Electric = "Electric",
}

export class CreateVehicleDto {
  @IsString()
  @MaxLength(20)
  vehicleNumber!: string;

  @IsEnum(FuelType)
  fuelType!: FuelType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  fuelConsumption!: number; // kWh/100km (electric) or L/100km (fuel)

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicleNumber?: string;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  fuelConsumption?: number;
}
