import type { UserRole } from "./roles";

export const DEMO_PASSWORD = "Vesta123!";

export const DEMO_ACCOUNTS: ReadonlyArray<{
  email: string;
  name: string;
  role: UserRole;
}> = [
  { email: "admin@vesta.id", name: "Admin Vesta", role: "ADMIN" },
  { email: "produsen@vesta.id", name: "Pak Tani", role: "PRODUCER" },
  { email: "gudang@vesta.id", name: "Gudang Sentral", role: "WAREHOUSE" },
  { email: "b2c@vesta.id", name: "Sari", role: "CONSUMER" },
  { email: "b2b@vesta.id", name: "Resto Nusantara", role: "BUSINESS" },
];
