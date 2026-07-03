import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { PrismaService } from "../prisma/prisma.service";

// The five real-time alert sub-channels carried over from the .NET app. Each maps
// to a boolean column on NotificationSettings.
export type AlertChannel = "speed" | "hazard" | "erp" | "traffic" | "weather";

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
  /** For REAL_TIME alerts, the sub-channel to gate on (speed/hazard/erp/...). */
  channel?: AlertChannel;
}

// Map a NotificationType to its settings toggle column.
const TYPE_TOGGLE: Record<NotificationType, keyof DefaultSettings> = {
  PRE_DRIVE: "preDrive",
  REAL_TIME: "realTime",
  POST_TRIP: "postTrip",
  SYSTEM: "system",
};

interface DefaultSettings {
  preDrive: boolean;
  realTime: boolean;
  postTrip: boolean;
  system: boolean;
  speed: boolean;
  hazard: boolean;
  erp: boolean;
  traffic: boolean;
  weather: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // The AWS SDK v3 is provided by the Lambda runtime; region is auto-detected there.
  private readonly sqs = new SQSClient({});
  // Push/job queue URL, injected by the NestjsApi construct at deploy time.
  private readonly queueUrl = process.env.PUSH_QUEUE_URL;

  constructor(private readonly prisma: PrismaService) {}

  // ---- device tokens -------------------------------------------------------

  async registerDevice(userId: string, token: string, platform?: string) {
    // A token uniquely identifies a device; re-point it at this user on conflict
    // (devices get handed between accounts on shared phones / re-installs).
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
    return { ok: true };
  }

  async unregisterDevice(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  // ---- settings ------------------------------------------------------------

  /** Get the user's settings, creating defaults (all-on) on first access. */
  getSettings(userId: string) {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  updateSettings(userId: string, patch: Partial<DefaultSettings>) {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: patch,
    });
  }

  // ---- in-app feed ---------------------------------------------------------

  list(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification
      .count({ where: { userId, read: false } })
      .then((count) => ({ count }));
  }

  async markRead(userId: string, id: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    if (res.count === 0) throw new NotFoundException("Notification not found");
    return { ok: true };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: res.count };
  }

  // ---- creation + push fan-out --------------------------------------------

  /**
   * Persist an in-app notification and enqueue a push fan-out, honouring the
   * user's settings. Returns null if the relevant toggle/channel is off (the
   * notification is "filtered" and nothing is delivered).
   */
  async create(userId: string, input: CreateNotificationInput) {
    const settings = await this.getSettings(userId);
    if (!settings[TYPE_TOGGLE[input.type]]) return null;
    if (input.channel && !settings[input.channel]) return null;

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });

    await this.enqueuePush(userId, notification.id, input.title, input.body, input.data);
    return notification;
  }

  /** Best-effort enqueue of a push job for the worker to deliver. */
  private async enqueuePush(
    userId: string,
    notificationId: string,
    title: string,
    body: string,
    data?: Prisma.InputJsonValue,
  ) {
    if (!this.queueUrl) {
      this.logger.debug("PUSH_QUEUE_URL unset; skipping push enqueue");
      return;
    }
    try {
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify({ kind: "push", userId, notificationId, title, body, data }),
        }),
      );
    } catch (err) {
      // A failed push enqueue must not fail the originating request - the in-app
      // notification is already persisted and will show in the center.
      this.logger.error(`push enqueue failed: ${(err as Error).message}`);
    }
  }
}
