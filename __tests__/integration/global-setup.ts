import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import {
  adminDatabaseUrl,
  testDatabaseName,
  testDatabaseUrl,
} from "./helpers/test-db-url";

const { Client } = pg;

async function recreateDatabase() {
  const admin = new Client({ connectionString: adminDatabaseUrl() });
  await admin.connect();

  const name = testDatabaseName();
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Nama database test tidak aman: ${name}`);
  }

  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } catch {
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  }
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
}

function bootstrapSchema() {
  const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
  const url = testDatabaseUrl();

  execFileSync(prismaBin, ["db", "init", "--db", url, "--yes"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

/**
 * Vitest global setup: recreate an empty test database and apply the Prisma 8
 * contract so every run starts from a known schema.
 */
export async function setup() {
  await recreateDatabase();
  bootstrapSchema();
}

export async function teardown() {
  // The database is recreated by the next run; leaving it in place makes
  // debugging a failed suite easier.
}
