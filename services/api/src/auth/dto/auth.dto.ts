import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class SocialLoginDto {
  @IsString()
  provider!: "google" | "apple";

  /** The id_token / identity token from the provider, verified server-side. */
  @IsString()
  idToken!: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
