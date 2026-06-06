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
import { generateForUser, computeInsights } from "./route-analysis/analysis";

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

// ---- Pre-drive intelligence ------------------------------------------------

const DATA_GOV = "https://api.data.gov.sg/v1/environment";
const LTA_BASE = "https://datamall2.mytransport.sg/ltaodataservice";

function sgtParts(now: Date): { day: number; hour: number } {
  const sgt = new Date(now.getTime() + 8 * 3_600_000);
  return { day: sgt.getUTCDay(), hour: sgt.getUTCHours() };
}
function startOfSgtDayUtc(now: Date): Date {
  const sgt = new Date(now.getTime() + 8 * 3_600_000);
  const midnightSgtAsUtc = Date.UTC(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate());
  return new Date(midnightSgtAsUtc - 8 * 3_600_000);
}
function fmtHour(h: number): string {
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${am ? "am" : "pm"}`;
}

async function liveWeatherSummary(): Promise<string | null> {
  try {
    const res = await fetch(`${DATA_GOV}/2-hour-weather-forecast`);
    const body = (await res.json()) as { items?: { forecasts?: { area: string; forecast: string }[] }[] };
    const forecasts = body.items?.[0]?.forecasts ?? [];
    if (!forecasts.length) return null;
    const counts = new Map<string, number>();
    for (const f of forecasts) counts.set(f.forecast, (counts.get(f.forecast) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  } catch {
    return null;
  }
}
async function liveTrafficCount(): Promise<number | null> {
  const key = process.env.LTA_ACCOUNT_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${LTA_BASE}/TrafficIncidents`, {
      headers: { AccountKey: key, accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { value?: unknown[] };
    return body.value?.length ?? 0;
  } catch {
    return null;
  }
}

/**
 * Pre-drive sweep (fired hourly by EventBridge). For each user who has a device,
 * opted into pre-drive alerts, and enough trip history to show a pattern, send a
 * heads-up roughly an hour before their usual departure time with the current
 * weather, traffic, and an ERP-peak warning. One alert per user per day.
 */
async function handlePreDriveSweep(): Promise<void> {
  const now = new Date();
  const { day, hour } = sgtParts(now);
  if (day === 0 || day === 6) {
    console.log("pre-drive: weekend in SGT, skipping");
    return;
  }

  const users = await prisma.user.findMany({
    where: { devices: { some: {} }, trips: { some: {} } },
    select: { id: true },
  });
  if (!users.length) return;

  const weather = await liveWeatherSummary();
  const traffic = await liveTrafficCount();
  const dayStart = startOfSgtDayUtc(now);
  let sent = 0;

  for (const { id: userId } of users) {
    try {
      const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
      if (settings && !settings.preDrive) continue; // user muted pre-drive alerts

      const trips = await prisma.tripSummary.findMany({ where: { userId } });
      if (trips.length < 3) continue; // not enough history for a reliable pattern
      const { peakHour } = computeInsights(trips);
      if (peakHour == null) continue;

      // Fire roughly an hour before the usual departure hour.
      if (peakHour !== (hour + 1) % 24) continue;

      // At most one pre-drive alert per user per SGT day.
      const already = await prisma.notification.count({
        where: { userId, type: "PRE_DRIVE", createdAt: { gte: dayStart } },
      });
      if (already > 0) continue;

      const bits: string[] = [];
      if (weather) bits.push(`weather looks ${weather.toLowerCase()}`);
      if (traffic != null) {
        bits.push(traffic > 0 ? `${traffic} traffic incident${traffic > 1 ? "s" : ""} reported` : "roads are clear");
      }
      const erpPeak = (peakHour >= 7 && peakHour < 10) || (peakHour >= 17 && peakHour < 20);
      if (erpPeak) bits.push("ERP peak pricing will be active, so leaving a little earlier or later can save on charges");
      const body = `You usually set off around ${fmtHour(peakHour)}.${bits.length ? " " + capitalise(bits.join("; ")) + "." : ""}`;

      const notification = await prisma.notification.create({
        data: { userId, type: "PRE_DRIVE", title: "Heads up before your drive", body, data: { kind: "pre-drive" } },
      });
      await handlePush({
        kind: "push",
        userId,
        notificationId: notification.id,
        title: notification.title,
        body,
        data: { kind: "pre-drive" },
      });
      sent++;
    } catch (err) {
      console.error(`pre-drive: user ${userId} failed: ${(err as Error).message}`);
    }
  }
  console.log(`pre-drive: SGT ${hour}:00, scanned ${users.length} user(s), sent ${sent}`);
}

function capitalise(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}

async function handleRecord(record: SQSRecord): Promise<void> {
  const job = JSON.parse(record.body) as { kind?: string };
  if (job.kind === "push") {
    await handlePush(job as PushJob);
  } else if (job.kind === "analyze-all") {
    await handleAnalyzeAll();
  } else if (job.kind === "pre-drive-sweep") {
    await handlePreDriveSweep();
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
