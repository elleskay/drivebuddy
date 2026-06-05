// Applies pending Prisma migrations before deploy (run by deploy-api.yml).
// Neon: schema migrations must use a DIRECT (non-pooled) connection - the
// pgbouncer pooler doesn't support the session-level locks Prisma Migrate needs.
// We derive the direct endpoint from the pooled DATABASE_URL by dropping "-pooler".
import { execSync } from "node:child_process";

const pooled = process.env.DATABASE_URL;
if (!pooled) {
  console.log("No DATABASE_URL set; skipping migrations.");
  process.exit(0);
}

const direct = pooled.replace("-pooler.", ".");

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: direct, DIRECT_URL: direct },
});
