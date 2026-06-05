import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/jwt.strategy";
import { NotificationsService } from "./notifications.service";
import {
  RegisterDeviceDto,
  TestNotificationDto,
  UnregisterDeviceDto,
  UpdateSettingsDto,
} from "./dto";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // device tokens
  @Post("devices")
  registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(user.id, dto.token, dto.platform);
  }

  @Delete("devices")
  unregisterDevice(@CurrentUser() user: AuthUser, @Body() dto: UnregisterDeviceDto) {
    return this.notifications.unregisterDevice(user.id, dto.token);
  }

  // settings
  @Get("settings")
  getSettings(@CurrentUser() user: AuthUser) {
    return this.notifications.getSettings(user.id);
  }

  @Patch("settings")
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.notifications.updateSettings(user.id, dto);
  }

  // feed
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100) : 50;
    return this.notifications.list(user.id, n);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post(":id/read")
  markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.markRead(user.id, id);
  }

  // verification helper: fire a SYSTEM notification to yourself
  @Post("test")
  test(@CurrentUser() user: AuthUser, @Body() dto: TestNotificationDto) {
    return this.notifications.create(user.id, {
      type: "SYSTEM",
      title: dto.title ?? "DriveBuddy",
      body: dto.body ?? "This is a test notification 🎉",
      data: { kind: "test" },
    });
  }
}
