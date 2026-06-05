// Root-level Lambda entry for the SQS worker. Kept at the bundle root (handler
// "worker.handler") so the nodejs runtime doesn't treat a slashed handler as a
// bare ESM specifier.
//
// Phase B has no async work yet — this is a no-op consumer. Real handlers (push
// fan-out, scheduled analytics) are added in Phase E/G.
import type { SQSEvent, SQSBatchResponse } from "aws-lambda";

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  if (event.Records?.length) {
    console.log(`worker: received ${event.Records.length} message(s); no handler wired yet`);
  }
  return { batchItemFailures: [] };
}
