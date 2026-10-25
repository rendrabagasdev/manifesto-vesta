import type { UserRole } from "./roles";

export const DEMO_PASSWORD = "Vesta123!";

export const DEMO_ACCOUNTS: ReadonlyArray<{
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  city: string;
  address: string;
}> = [
  {
    email: "admin@vesta.id",
    name: "Admin Vesta",
    role: "ADMIN",
    phone: "0812 1000 0001",
    city: "Kota Bandung",
    address: "Jl. Asia Afrika No. 8, Sumur Bandung",
  },
  {
    email: "produsen@vesta.id",
    name: "Pak Tani",
    role: "PRODUCER",
    phone: "0812 2000 0002",
    city: "Kab. Bandung Barat",
    address: "Jl. Lembang No. 45, Parongpong",
  },
  {
    email: "gudang@vesta.id",
    name: "Gudang Sentral",
    role: "WAREHOUSE",
    phone: "0812 3000 0003",
    city: "Kota Cimahi",
    address: "Jl. Baros No. 12, Cimahi Tengah",
  },
  {
    email: "b2c@vesta.id",
    name: "Sari",
    role: "CONSUMER",
    phone: "0812 4000 0004",
    city: "Kota Bandung",
    address: "Jl. Cihampelas No. 45, Coblong",
  },
  {
    email: "b2b@vesta.id",
    name: "Resto Nusantara",
    role: "BUSINESS",
    phone: "0812 5000 0005",
    city: "Kota Bandung",
    address: "Jl. Braga No. 20, Sumur Bandung",
  },
];
