// Root-level Lambda entry for the SQS worker. Kept at the bundle root (handler
// "worker.handler") so the nodejs runtime doesn't treat a slashed handler as a
// bare ESM specifier.
//
// Phase E: delivers push notifications. The HTTP API enqueues `{ kind: "push" }`
// jobs (see NotificationsService.enqueuePush); this worker loads the user's
// registered Expo push tokens and sends via the Expo push service, pruning any
// tokens Expo reports as no longer registered.
import type { SQSEvent, SQSBatchResponse, SQSRecord } from "aws-lambda";
import { PrismaClient } from "@prisma/client";
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { generateForUser } from "./route-analysis/analysis";

// Reused across warm invocations (one client/connection per container).
const prisma = new PrismaClient();
const expo = new Expo();

interface PushJob {
  kind: "push";
  userId: string;
  notificationId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function handlePush(job: PushJob): Promise<void> {
  const devices = await prisma.deviceToken.findMany({ where: { userId: job.userId } });
  const tokens = devices.map((d) => d.token).filter((t) => Expo.isExpoPushToken(t));
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    sound: "default",
    title: job.title,
    body: job.body,
    data: { notificationId: job.notificationId, ...(job.data ?? {}) },
  }));

  const tickets: ExpoPushTicket[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    tickets.push(...(await expo.sendPushNotificationsAsync(chunk)));
  }

  // Prune tokens Expo says are dead so we stop paying to send to them.
  const dead: string[] = [];
  tickets.forEach((ticket, i) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      const token = tokens[i];
      if (token) dead.push(token);
    }
  });
  if (dead.length) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
  }
}

/**
 * Daily behaviour-analysis job (fired by EventBridge Scheduler). Regenerates
 * recommendations for every user with trips and notifies those who got new ones.
 */
async function handleAnalyzeAll(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { trips: { some: {} } },
    select: { id: true },
  });
  let notified = 0;
  for (const { id: userId } of users) {
    try {
      const fresh = await generateForUser(prisma, userId);
      if (fresh.length === 0) continue;
      const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
      if (settings && !settings.system) continue; // user muted system notifications
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "New driving tips 💡",
          body: `You have ${fresh.length} fresh recommendation${fresh.length > 1 ? "s" : ""} based on your recent drives.`,
          data: { kind: "recommendations" },
        },
      });
      await handlePush({
        kind: "push",
        userId,
        notificationId: notification.id,
        title: notification.title,
        body: notification.body,
        data: { kind: "recommendations" },
      });
      notified++;
    } catch (err) {
      console.error(`analyze-all: user ${userId} failed: ${(err as Error).message}`);
    }
  }
  console.log(`analyze-all: processed ${users.length} user(s), notified ${notified}`);
}

async function handleRecord(record: SQSRecord): Promise<void> {
  const job = JSON.parse(record.body) as { kind?: string };
  if (job.kind === "push") {
    await handlePush(job as PushJob);
  } else if (job.kind === "analyze-all") {
    await handleAnalyzeAll();
  } else {
    console.log(`worker: unknown job kind "${job.kind}"; ignoring`);
  }
}

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: { itemIdentifier: string }[] = [];
  for (const record of event.Records ?? []) {
    try {
      await handleRecord(record);
    } catch (err) {
      console.error(`worker: record ${record.messageId} failed: ${(err as Error).message}`);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}
