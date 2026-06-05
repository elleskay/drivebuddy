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
import { generateForUser } from "./route-analysis/analysis";

// Reused across warm invocations (one client/connection per container).
const prisma = new PrismaClient();

// Call the Expo push service over HTTP directly (no SDK). expo-server-sdk is
// ESM-only and can't be require()'d from the CommonJS bundle nest build emits
// (ERR_REQUIRE_ESM crashes the worker on init), so we hit the documented
// endpoint ourselves: https://docs.expo.dev/push-notifications/sending-notifications/
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

interface PushJob {
  kind: "push";
  userId: string;
  notificationId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function handlePush(job: PushJob): Promise<void> {
  const devices = await prisma.deviceToken.findMany({ where: { userId: job.userId } });
  const tokens = devices.map((d) => d.token).filter((t) => PUSH_TOKEN_RE.test(t));
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: job.title,
    body: job.body,
    data: { notificationId: job.notificationId, ...(job.data ?? {}) },
  }));

  const dead: string[] = [];
  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const chunkTokens = tokens.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error(`expo push HTTP ${res.status}: ${await res.text()}`);
      continue;
    }
    const json = (await res.json()) as { data?: ExpoTicket[] };
    (json.data ?? []).forEach((ticket, idx) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        const token = chunkTokens[idx];
        if (token) dead.push(token);
      }
    });
  }

  // Prune tokens Expo says are dead so we stop sending to them.
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
          title: "New driving tips",
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
