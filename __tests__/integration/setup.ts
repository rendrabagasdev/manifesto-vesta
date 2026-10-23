import { testDatabaseUrl } from "./helpers/test-db-url";

// Must run before any module imports `@/src/prisma/db`, which reads
// DATABASE_URL once at import time.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "vesta-integration-test-secret-32chars";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.MIDTRANS_SERVER_KEY = "";
process.env.FONNTE_API_TOKEN = "";
process.env.SIMULATE_TIME_ENABLED = "true";
process.env.MAINTENANCE_MODE = "false";
