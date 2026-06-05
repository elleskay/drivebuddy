import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  getMe(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.id);
  }

  @Patch("me")
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }
}
