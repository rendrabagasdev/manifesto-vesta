import pg from "pg";
import { db } from "@/src/prisma/db";
import { testDatabaseUrl } from "./test-db-url";

const { Pool } = pg;

const TABLES = [
  "PlatformConfig",
  "ImpactLog",
  "LoyaltyLedger",
  "OrderItem",
  "Order",
  "CascadeEvent",
  "RescueDeal",
  "FeedListing",
  "ResidueListing",
  "PriceBreakdown",
  "Batch",
  "Product",
  "Warehouse",
  "Producer",
  "BuyerTier",
  "RescueQuotaUsage",
  "Post",
  "User",
] as const;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  pool ??= new Pool({ connectionString: testDatabaseUrl(), max: 2 });
  return pool;
}

/** Wipe every table, restarting identity sequences for deterministic ids. */
export async function truncateAll(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await getPool().query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Close both the Prisma 8 client and the raw pg pool used for fixtures. */
export async function closeTestResources(): Promise<void> {
  await db.close();
  if (pool) {
    await pool.end();
    pool = null;
  }
}
