import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(256)
  token!: string;

  @IsOptional()
  @IsIn(["ios", "android"])
  platform?: "ios" | "android";
}

export class UnregisterDeviceDto {
  @IsString()
  @MaxLength(256)
  token!: string;
}

/** All toggles optional - only the supplied ones are updated. */
export class UpdateSettingsDto {
  @IsOptional() @IsBoolean() preDrive?: boolean;
  @IsOptional() @IsBoolean() realTime?: boolean;
  @IsOptional() @IsBoolean() postTrip?: boolean;
  @IsOptional() @IsBoolean() system?: boolean;
  @IsOptional() @IsBoolean() speed?: boolean;
  @IsOptional() @IsBoolean() hazard?: boolean;
  @IsOptional() @IsBoolean() erp?: boolean;
  @IsOptional() @IsBoolean() traffic?: boolean;
  @IsOptional() @IsBoolean() weather?: boolean;
}

/** Manually fire a notification to yourself - used to verify the push pipeline. */
export class TestNotificationDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(500) body?: string;
}
