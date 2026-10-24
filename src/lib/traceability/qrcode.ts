/**
 * QR traceability helpers.
 *
 * Each batch gets a QR code that points at the public trace page
 * (`/trace/{batchCode}`). The PDF is a printable crate label containing the
 * same journey the trace page renders: producer → warehouse → cascade history
 * → price breakdown → impact estimate.
 */

import { createElement, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  formatDate,
  formatDateTime,
  formatInteger,
  formatKg,
  formatNumber,
} from "@/src/lib/batches/format";

export const QR_CODE_SIZE = 256;
export const QR_CODE_MARGIN = 1;

export interface TraceabilityBatch {
  code: string;
  freshnessScore?: number;
  status?: string;
  harvestDate?: string;
  receivedAt?: string | Date;
  storageTempC?: number;
  quantityKg?: number;
  reservedKg?: number;
  qualityNote?: string | null;
  product?:
    | {
        name?: string | null;
        category?: string | null;
        unit?: string | null;
        producer?:
          | { farmName?: string | null; address?: string | null }
          | null;
      }
    | null;
  warehouse?:
    | {
        name?: string | null;
        city?: string | null;
        address?: string | null;
      }
    | null;
  priceBreakdown?:
    | {
        basePricePerKg?: number;
        warehouseCostPerKg?: number;
        logisticsCostPerKg?: number;
        marginPerKg?: number;
        finalPricePerKg?: number;
      }
    | null;
  cascadeEvents?: Array<{
    fromStatus?: string | null;
    toStatus?: string;
    freshnessScore?: number;
    reason?: string | null;
    createdAt?: string | Date;
    actor?: { name?: string | null } | null;
  }>;
  impactLogs?: Array<{
    rescuedKg?: number;
    co2eSavedKg?: number;
    waterSavedLiters?: number;
    wasteDivertedKg?: number;
  }>;
}

/** Alias matching the task/spec wording. */
export type BatchWithRelations = TraceabilityBatch;

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function appBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "";
  const base = configured || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export function getTraceabilityUrl(batchCode: string): string {
  return `${appBaseUrl()}/trace/${encodeURIComponent(batchCode.trim())}`;
}

function formatIdr(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return idrFormatter.format(Math.round(value));
}

function safeDateTime(value: string | Date | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDateTime(date);
}

function safeDate(value: string | undefined): string {
  if (!value) return "-";
  return formatDate(value);
}

/**
 * Returns a PNG data URL (`data:image/png;base64,...`) so it can be used in
 * `<img>`, `<Image>` (react-pdf) and WhatsApp/print templates alike.
 */
export async function generateBatchQRCode(
  batchCode: string,
): Promise<string> {
  const code = batchCode.trim();
  if (!code) {
    throw new Error("Kode batch wajib diisi untuk membuat QR code.");
  }

  return QRCode.toDataURL(getTraceabilityUrl(code), {
    type: "image/png",
    errorCorrectionLevel: "M",
    margin: QR_CODE_MARGIN,
    width: QR_CODE_SIZE,
    color: {
      dark: "#1c2420",
      light: "#ffffff",
    },
  });
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 44,
    paddingVertical: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1c2420",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#2f5d4a",
    paddingBottom: 12,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#2f5d4a",
  },
  subtitle: { fontSize: 9, color: "#5f6b64", marginTop: 3 },
  qrBox: { alignItems: "flex-end", width: 92 },
  qr: { width: 78, height: 78 },
  qrCaption: { fontSize: 6.5, color: "#8a948e", marginTop: 3, textAlign: "right" },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginTop: 22,
  },
  code: { fontSize: 11, color: "#5f6b64", marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2f5d4a",
    marginBottom: 6,
  },
  card: {
    borderWidth: 0.6,
    borderColor: "#dfe5e1",
    borderRadius: 4,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.4,
    borderBottomColor: "#eef2ef",
    paddingVertical: 5,
  },
  rowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  label: { color: "#5f6b64" },
  value: { fontFamily: "Helvetica-Bold" },
  stageBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  stageChip: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: "#f2f5f3",
    marginRight: 4,
  },
  stageChipActive: { backgroundColor: "#2f5d4a", color: "#ffffff" },
  stageText: { fontSize: 7.5 },
  timelineItem: {
    borderLeftWidth: 1.5,
    borderLeftColor: "#c7d3cc",
    paddingLeft: 8,
    paddingBottom: 8,
  },
  timelineTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  timelineMeta: { fontSize: 8, color: "#5f6b64", marginTop: 1 },
  timelineBody: { fontSize: 8.5, marginTop: 2, lineHeight: 1.35 },
  note: {
    fontSize: 7.5,
    color: "#8a948e",
    marginTop: 16,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: "#8a948e",
    borderTopWidth: 0.5,
    borderTopColor: "#dfe5e1",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const STAGES = ["FRESH", "RESCUE", "FEED", "RESIDUE", "DISPOSED"] as const;

function stageLabel(value: string | undefined): string {
  switch (value) {
    case "FRESH":
      return "Segar";
    case "RESCUE":
      return "Layu";
    case "FEED":
      return "Pakan";
    case "RESIDUE":
      return "Residu";
    case "DISPOSED":
      return "Dibuang";
    default:
      return value ?? "-";
  }
}

function Row(props: { label: string; value: string; last?: boolean }) {
  return createElement(
    View,
    { style: props.last ? styles.rowLast : styles.row },
    createElement(Text, { style: styles.label }, props.label),
    createElement(Text, { style: styles.value }, props.value),
  );
}

function Section(props: { title: string; children?: ReactNode }) {
  return createElement(
    View,
    { style: styles.section },
    createElement(Text, { style: styles.sectionTitle }, props.title),
    props.children,
  );
}

/**
 * Build the printable traceability label. Pure with respect to inputs: pass a
 * batch loaded with its relations (or the shape returned by the trace query).
 */
export async function generateTraceabilityPDF(
  batch: TraceabilityBatch,
): Promise<Buffer> {
  if (!batch?.code) {
    throw new Error("Batch wajib memiliki kode untuk membuat PDF traceability.");
  }

  const qrDataUrl = await generateBatchQRCode(batch.code);
  const productName = batch.product?.name ?? "Komoditas";
  const producer = batch.product?.producer ?? null;
  const warehouse = batch.warehouse ?? null;
  const price = batch.priceBreakdown ?? null;
  const events = [...(batch.cascadeEvents ?? [])].sort(
    (a, b) =>
      new Date(a.createdAt ?? 0).getTime() -
      new Date(b.createdAt ?? 0).getTime(),
  );
  const impact = (batch.impactLogs ?? []).reduce<{
    rescuedKg: number;
    co2eSavedKg: number;
    waterSavedLiters: number;
    wasteDivertedKg: number;
  }>(
    (totals, log) => ({
      rescuedKg: totals.rescuedKg + (log.rescuedKg ?? 0),
      co2eSavedKg: totals.co2eSavedKg + (log.co2eSavedKg ?? 0),
      waterSavedLiters:
        totals.waterSavedLiters + (log.waterSavedLiters ?? 0),
      wasteDivertedKg:
        totals.wasteDivertedKg + (log.wasteDivertedKg ?? 0),
    }),
    {
      rescuedKg: 0,
      co2eSavedKg: 0,
      waterSavedLiters: 0,
      wasteDivertedKg: 0,
    },
  );

  const availableKg = Math.max(
    0,
    (batch.quantityKg ?? 0) - (batch.reservedKg ?? 0),
  );

  const journey = [
    createElement(
      View,
      { key: "harvest", style: styles.timelineItem },
      createElement(
        Text,
        { style: styles.timelineTitle },
        `Panen — ${producer?.farmName ?? "Produsen"}`,
      ),
      createElement(
        Text,
        { style: styles.timelineMeta },
        safeDate(batch.harvestDate),
      ),
      createElement(
        Text,
        { style: styles.timelineBody },
        producer?.address
          ? `${productName} dipanen di ${producer.address}.`
          : `${productName} dipanen dan dikirim ke gudang.`,
      ),
    ),
    createElement(
      View,
      { key: "warehouse", style: styles.timelineItem },
      createElement(
        Text,
        { style: styles.timelineTitle },
        `Diterima — ${warehouse?.name ?? "Gudang"}`,
      ),
      createElement(
        Text,
        { style: styles.timelineMeta },
        safeDateTime(batch.receivedAt),
      ),
      createElement(
        Text,
        { style: styles.timelineBody },
        `Suhu simpan ${formatNumber(batch.storageTempC ?? 0)}°C · stok awal ${formatKg(
          batch.quantityKg ?? 0,
        )}${warehouse?.city ? ` · ${warehouse.city}` : ""}.`,
      ),
    ),
    ...events.map((event, index) =>
      createElement(
        View,
        { key: `event-${index}`, style: styles.timelineItem },
        createElement(
          Text,
          { style: styles.timelineTitle },
          `Cascade — ${stageLabel(event.fromStatus ?? undefined)} → ${stageLabel(
            event.toStatus,
          )}`,
        ),
        createElement(
          Text,
          { style: styles.timelineMeta },
          `${safeDateTime(event.createdAt)} · skor ${formatNumber(
            event.freshnessScore ?? 0,
          )}/100`,
        ),
        createElement(
          Text,
          { style: styles.timelineBody },
          event.reason ?? "Transisi otomatis oleh mesin cascade.",
        ),
      ),
    ),
  ];

  const doc = createElement(
    Document,
    {
      title: `Traceability ${batch.code}`,
      author: "Vesta",
      subject: `Perjalanan batch ${productName}`,
    },
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(
        View,
        { style: styles.header },
        createElement(
          View,
          null,
          createElement(Text, { style: styles.brand }, "Vesta"),
          createElement(
            Text,
            { style: styles.subtitle },
            "Platform Kaskade Kesegaran",
          ),
          createElement(
            Text,
            { style: styles.subtitle },
            "Label traceability batch",
          ),
        ),
        createElement(
          View,
          { style: styles.qrBox },
          createElement(Image, { src: qrDataUrl, style: styles.qr }),
          createElement(
            Text,
            { style: styles.qrCaption },
            "Pindai untuk melihat perjalanan batch",
          ),
        ),
      ),
      createElement(Text, { style: styles.title }, productName),
      createElement(
        Text,
        { style: styles.code },
        `Kode batch ${batch.code} · ${stageLabel(batch.status)} · skor ${formatNumber(
          batch.freshnessScore ?? 0,
        )}/100`,
      ),
      createElement(
        View,
        { style: styles.stageBar },
        ...STAGES.map((stage) =>
          createElement(
            View,
            {
              key: stage,
              style: [
                styles.stageChip,
                batch.status === stage
                  ? { backgroundColor: "#2f5d4a" }
                  : {},
              ],
            },
            createElement(
              Text,
              {
                style: [
                  styles.stageText,
                  batch.status === stage ? { color: "#ffffff" } : {},
                ],
              },
              stageLabel(stage),
            ),
          ),
        ),
      ),
      createElement(
        Section,
        { title: "Ringkasan batch" },
        createElement(
          View,
          { style: styles.card },
          Row({ label: "Kategori", value: batch.product?.category ?? "-" }),
          Row({
            label: "Stok tersedia",
            value: `${formatKg(availableKg)} dari ${formatKg(batch.quantityKg ?? 0)}`,
          }),
          Row({
            label: "Suhu penyimpanan",
            value: `${formatNumber(batch.storageTempC ?? 0)}°C`,
          }),
          Row({
            label: "Gudang",
            value: [warehouse?.name, warehouse?.city]
              .filter(Boolean)
              .join(", ") || "-",
          }),
          Row({
            label: "Catatan kualitas",
            value: batch.qualityNote?.trim() || "-",
            last: true,
          }),
        ),
      ),
      createElement(
        Section,
        { title: "Perjalanan batch" },
        createElement(View, { style: styles.card }, ...journey),
      ),
      createElement(
        Section,
        { title: "Rincian harga" },
        createElement(
          View,
          { style: styles.card },
          Row({
            label: "Harga dasar petani",
            value: `${formatIdr(price?.basePricePerKg)}/kg`,
          }),
          Row({
            label: "Biaya gudang",
            value: `${formatIdr(price?.warehouseCostPerKg)}/kg`,
          }),
          Row({
            label: "Logistik",
            value: `${formatIdr(price?.logisticsCostPerKg)}/kg`,
          }),
          Row({
            label: "Margin platform",
            value: `${formatIdr(price?.marginPerKg)}/kg`,
          }),
          Row({
            label: "Harga akhir",
            value: `${formatIdr(price?.finalPricePerKg)}/kg`,
            last: true,
          }),
        ),
      ),
      createElement(
        Section,
        { title: "Dampak (estimasi)" },
        createElement(
          View,
          { style: styles.card },
          Row({
            label: "Bahan tidak terbuang",
            value: `${formatNumber(impact.rescuedKg)} kg`,
          }),
          Row({
            label: "Emisi CO₂e dihindari",
            value: `${formatNumber(impact.co2eSavedKg)} kg`,
          }),
          Row({
            label: "Air dihemat",
            value: `${formatInteger(impact.waterSavedLiters)} liter`,
          }),
          Row({
            label: "Limbah dialihkan",
            value: `${formatNumber(impact.wasteDivertedKg)} kg`,
            last: true,
          }),
        ),
      ),
      createElement(
        Text,
        { style: styles.note },
        "Skor kesegaran dan dampak dihitung otomatis oleh Vesta berdasarkan data panen, suhu penyimpanan, dan waktu tempuh. Angka dampak bersifat estimasi.",
      ),
      createElement(
        View,
        { style: styles.footer, fixed: true },
        createElement(Text, null, `vesta.id/trace/${batch.code}`),
        createElement(Text, null, "Vesta · Platform Kaskade Kesegaran"),
      ),
    ),
  );

  return renderToBuffer(doc);
}
