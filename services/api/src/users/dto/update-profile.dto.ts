import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string; // ISO date (yyyy-mm-dd)

  @IsOptional()
  @IsString()
  @MaxLength(500)
  homeAddress?: string;
}
