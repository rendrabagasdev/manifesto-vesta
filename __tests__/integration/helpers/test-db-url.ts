import "dotenv/config";

/**
 * Integration tests run against a dedicated PostgreSQL database so they never
 * touch the development/demo data. Override with TEST_DATABASE_URL when CI
 * provisions its own instance.
 */
export const TEST_DATABASE_NAME = "vesta_test";

function replaceDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

export function baseDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://postgres:@localhost:5433/postgres?schema=public"
  );
}

export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  return replaceDatabase(baseDatabaseUrl(), TEST_DATABASE_NAME);
}

/**
 * Connection used only to CREATE/DROP the test database. It must point at an
 * already-existing database (the maintenance DB of the same server).
 */
export function adminDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_ADMIN_URL) {
    return process.env.TEST_DATABASE_ADMIN_URL;
  }
  return replaceDatabase(baseDatabaseUrl(), "postgres");
}

export function testDatabaseName(): string {
  return new URL(testDatabaseUrl()).pathname.replace(/^\//, "");
}
