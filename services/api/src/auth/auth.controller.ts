import { Body, Controller, Post, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { IsString } from "class-validator";

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
