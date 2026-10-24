export const USER_ROLES = [
  "ADMIN",
  "PRODUCER",
  "WAREHOUSE",
  "CONSUMER",
  "BUSINESS",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  PRODUCER: "Produsen",
  WAREHOUSE: "Gudang",
  CONSUMER: "Konsumen",
  BUSINESS: "Bisnis",
};

export const ROLE_SUMMARIES: Record<UserRole, string> = {
  ADMIN:
    "Pantau cascade, kelola tier, dan audit dampak di seluruh ekosistem.",
  PRODUCER:
    "Catat pasokan, tetapkan harga dasar, dan pantau pembayaran dari satu tempat.",
  WAREHOUSE:
    "Terima batch, catat suhu penyimpanan, dan jaga akurasi Skor Kesegaran.",
  CONSUMER:
    "Belanja bahan segar dengan harga normal atau beli penawaran layu sesuai tier.",
  BUSINESS:
    "Penuhi kebutuhan usaha dalam jumlah besar, termasuk pakan dan residu.",
};

export const ROLE_MODULES: Record<UserRole, readonly string[]> = {
  ADMIN: ["Monitoring cascade", "Tier & harga", "Audit dampak"],
  PRODUCER: ["Input stok & harga dasar", "Status batch", "Pembayaran"],
  WAREHOUSE: ["Penerimaan batch", "Suhu & kualitas", "Update status"],
  CONSUMER: ["Marketplace segar", "Penawaran Layu", "Riwayat pesanan"],
  BUSINESS: ["Katalog grosir", "Pakan & residu", "Sertifikat dampak"],
};

export const BATCH_VIEW_ROLES: readonly UserRole[] = [
  "ADMIN",
  "PRODUCER",
  "WAREHOUSE",
];

export const BATCH_CREATE_ROLES: readonly UserRole[] = [
  "ADMIN",
  "PRODUCER",
];

export const BATCH_UPDATE_ROLES: readonly UserRole[] = ["ADMIN", "WAREHOUSE"];

export const BATCH_DELETE_ROLES: readonly UserRole[] = [
  "ADMIN",
  "PRODUCER",
];

export const PRODUCT_MANAGE_ROLES: readonly UserRole[] = ["ADMIN", "PRODUCER"];

export const ORDER_FULFILL_ROLES: readonly UserRole[] = ["ADMIN", "WAREHOUSE"];

export function hasRole(
  role: UserRole,
  roles: readonly UserRole[],
): boolean {
  return roles.includes(role);
}
