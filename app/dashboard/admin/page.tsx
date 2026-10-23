import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Droplets, Leaf, Recycle, Users } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import { getBatchesForUser } from "@/src/lib/batches/queries";
import { summarizeBatches } from "@/src/lib/batches/metrics";
import { BATCH_STATUSES, STATUS_META } from "@/src/lib/batches/freshness";
import {
  formatIdr,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";
import {
  getAllUsersWithTiers,
  getImpactSummaryFor,
  getProductsForAdmin,
} from "@/src/lib/marketplace/queries";
import { TIER_BENEFITS, TIER_NAMES } from "@/src/lib/loyalty/tiers";
import { ROLE_LABELS } from "@/src/lib/auth/roles";
import { StatusPill } from "@/src/components/status-pill";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard admin — Vesta",
  description: "Monitoring cascade, tier, harga dasar, dan dampak.",
};

export default async function AdminDashboardPage() {
  await connection();
  const user = await requireRole(["ADMIN"]);

  const [batches, impact, products, users] = await Promise.all([
    getBatchesForUser(user),
    getImpactSummaryFor(),
    getProductsForAdmin(),
    getAllUsersWithTiers(),
  ]);

  const summary = summarizeBatches(batches);
  const buyers = users.filter((u) => u.role === "CONSUMER" || u.role === "BUSINESS");

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Dashboard admin
        </h1>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Pusat kendali cascade: pemantauan seluruh batch, konfigurasi tier,
            harga dasar, dan analitik dampak.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/admin/simulate"
              className="inline-flex h-9 items-center rounded-lg bg-brand-strong px-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Buka simulasi waktu
            </Link>
          </div>
        </div>
      </header>

      <section
        aria-label="Analitik dampak"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4"
      >
        <div className="bg-surface p-4">
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Leaf className="size-3.5" aria-hidden="true" />
            Terselamatkan
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(impact.totalRescuedKg)}
            <span className="text-sm font-normal text-ink-muted"> kg</span>
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Recycle className="size-3.5" aria-hidden="true" />
            CO₂e dihindari
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(impact.totalCo2eSavedKg)}
            <span className="text-sm font-normal text-ink-muted"> kg</span>
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Droplets className="size-3.5" aria-hidden="true" />
            Air dihemat
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(impact.totalWaterSavedLiters)}
            <span className="text-sm font-normal text-ink-muted"> L</span>
          </p>
        </div>
        <div className="bg-surface p-4">
          <p className="text-xs text-ink-muted">Waste Diversion Rate</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatNumber(impact.wasteDiversionRate)}
            <span className="text-sm font-normal text-ink-muted">%</span>
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="cascade-heading" className="rounded-xl border border-line bg-surface lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="cascade-heading" className="text-sm font-semibold text-ink">
              Pemantauan cascade — {formatInteger(summary.total)} batch
            </h2>
            <Link
              href="/dashboard/batches"
              className="text-xs font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Kelola batch
            </Link>
          </div>
          {batches.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">
              Belum ada batch di sistem.
            </p>
          ) : (
            <ul>
              {batches.slice(0, 7).map((batch) => (
                <li key={batch.id} className="border-b border-line last:border-0">
                  <Link
                    href={`/dashboard/batches/${batch.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{batch.code}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {batch.product.name} · {batch.warehouse.name} ·{" "}
                        {formatKg(Math.max(0, batch.quantityKg - batch.reservedKg))}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {formatNumber(batch.freshnessScore)}
                        <span className="text-xs font-normal text-ink-muted">/100</span>
                      </span>
                      <StatusPill status={batch.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="stage-heading" className="rounded-xl border border-line bg-surface p-4">
          <h2 id="stage-heading" className="text-sm font-semibold text-ink">
            Sebaran tahap
          </h2>
          <ul className="mt-3 space-y-1">
            {BATCH_STATUSES.map((status) => {
              const meta = STATUS_META[status];
              const count = summary.statusCounts[status];
              const share = summary.total > 0 ? (count / summary.total) * 100 : 0;
              return (
                <li key={status} className="flex items-center gap-3 px-2 py-1.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${meta.dotClassName}`} aria-hidden="true" />
                  <span className="w-16 shrink-0 text-sm text-ink">{meta.label}</span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className={`block h-full rounded-full ${meta.dotClassName}`}
                      style={{ width: `${Math.max(count > 0 ? 3 : 0, share)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-sm tabular-nums text-ink-muted">
                    {formatInteger(count)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="tier-heading" className="rounded-xl border border-line bg-surface">
          <div className="border-b border-line px-4 py-3">
            <h2 id="tier-heading" className="text-sm font-semibold text-ink">
              Konfigurasi tier
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="px-4 py-2 font-normal">Tier</th>
                <th className="px-4 py-2 text-right font-normal">Belanja 30 hari</th>
                <th className="px-4 py-2 text-right font-normal">Kuota/minggu</th>
                <th className="px-4 py-2 text-right font-normal">Early access</th>
              </tr>
            </thead>
            <tbody>
              {TIER_NAMES.map((tier) => {
                const benefit = TIER_BENEFITS[tier];
                return (
                  <tr key={tier} className="border-t border-line">
                    <td className="px-4 py-2.5 font-semibold text-ink">{benefit.label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                      {benefit.minimumSpend === 0 ? "—" : formatIdr(benefit.minimumSpend)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                      {benefit.rescueQuotaPerWeek}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                      {benefit.earlyAccessHours > 0 ? `+${benefit.earlyAccessHours} jam` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-ink-muted">
            Threshold tier saat ini mengikuti konfigurasi default — perubahan
            nilai akan tersedia lewat panel konfigurasi berikutnya.
          </p>
        </section>

        <section aria-labelledby="price-heading" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="price-heading" className="text-sm font-semibold text-ink">
              Harga dasar komoditas
            </h2>
            <p className="text-xs text-ink-muted">{formatInteger(products.length)} produk</p>
          </div>
          <ul>
            {products.slice(0, 5).map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {product.producer?.farmName ?? "Produsen mitra"} · umur simpan{" "}
                    {product.shelfLifeDays} hari
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {formatIdr(product.basePricePerKg)}
                  <span className="text-xs font-normal text-ink-muted">/{product.unit}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="users-heading" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="users-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Users className="size-4" aria-hidden="true" />
              Manajemen pengguna
            </h2>
            <p className="text-xs text-ink-muted">{formatInteger(users.length)} akun</p>
          </div>
          <ul>
            {users.slice(0, 6).map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{u.name ?? u.email}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {ROLE_LABELS[u.role]} · {u.email}
                  </p>
                </div>
                {u.tier ? (
                  <p className="shrink-0 text-xs font-semibold text-ink-muted">
                    {TIER_BENEFITS[u.tier.tier as keyof typeof TIER_BENEFITS]?.label ?? u.tier.tier}
                  </p>
                ) : (
                  <p className="shrink-0 text-xs text-ink-muted">—</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="demo-heading"
          className="rounded-xl border border-line bg-surface p-4"
        >
          <h2 id="demo-heading" className="text-sm font-semibold text-ink">
            Demo dan pengujian
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Jalankan percepatan waktu pada halaman simulasi terpisah agar
            aktivitas demo tidak tercampur dengan monitoring operasional.
          </p>
          <Link
            href="/dashboard/admin/simulate"
            className="mt-4 inline-flex text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Kelola simulasi waktu →
          </Link>
        </section>
      </div>
    </div>
  );
}
