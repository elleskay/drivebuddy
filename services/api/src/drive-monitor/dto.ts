import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class StartRouteDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class GpsPointDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsISO8601()
  timestamp!: string;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  speed?: number; // m/s

  @IsOptional()
  @IsNumber()
  accuracy?: number;
}

export class AddPointsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  points!: GpsPointDto[];
}
