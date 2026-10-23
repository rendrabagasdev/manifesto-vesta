import { NextResponse } from "next/server";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { requireApiUser } from "@/src/lib/api/http";
import { getImpactSummaryFor } from "@/src/lib/marketplace/queries";
import { formatInteger, formatNumber } from "@/src/lib/batches/format";

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 56,
    paddingVertical: 64,
    fontFamily: "Helvetica",
    color: "#1c2420",
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#2f5d4a" },
  subtitle: { fontSize: 11, color: "#5f6b64", marginTop: 4 },
  title: { fontSize: 26, fontFamily: "Helvetica-Bold", marginTop: 48 },
  meta: { fontSize: 11, color: "#5f6b64", marginTop: 8 },
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dfe5e1",
    paddingVertical: 10,
  },
  label: { fontSize: 11, color: "#5f6b64" },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  note: { fontSize: 9, color: "#8a948e", marginTop: 24, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 48,
    left: 56,
    right: 56,
    fontSize: 9,
    color: "#8a948e",
    borderTopWidth: 0.5,
    borderTopColor: "#dfe5e1",
    paddingTop: 10,
  },
});

export async function GET() {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: "Harus masuk untuk mengunduh sertifikat." },
      { status: 401 },
    );
  }

  const summary = await getImpactSummaryFor(undefined, Number(user.id));
  const issued = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const doc = (
    <Document
      title={`Sertifikat Dampak — ${user.name ?? "Mitra Vesta"}`}
      author="Vesta"
    >
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.brand}>Vesta</Text>
          <Text style={styles.subtitle}>Freshness Cascade Platform</Text>
        </View>

        <View>
          <Text style={styles.title}>Sertifikat Dampak</Text>
          <Text style={styles.meta}>
            Diterbitkan untuk {user.name ?? user.email} · {issued}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontribusi pembelian Anda</Text>
          <View style={{ marginTop: 8 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Bahan terselamatkan</Text>
              <Text style={styles.value}>{formatNumber(summary.totalRescuedKg)} kg</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Emisi CO₂e dihindari (estimasi)</Text>
              <Text style={styles.value}>{formatNumber(summary.totalCo2eSavedKg)} kg</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Air dihemat (estimasi)</Text>
              <Text style={styles.value}>{formatInteger(summary.totalWaterSavedLiters)} liter</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jumlah transaksi</Text>
              <Text style={styles.value}>{formatInteger(summary.totalTransactions)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konteks platform</Text>
          <View style={{ marginTop: 8 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Waste Diversion Rate platform</Text>
              <Text style={styles.value}>{formatNumber(summary.wasteDiversionRate)}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total batch diproses</Text>
              <Text style={styles.value}>{formatInteger(summary.totalBatchesProcessed)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.note}>
          Angka dihitung dari impact ledger Vesta dengan faktor emisi publik per
          kategori komoditas dan bersifat estimasi. Verifikasi pihak ketiga masuk
          fase berikutnya. Sertifikat ini dihasilkan otomatis dan tidak
          memerlukan tanda tangan basah.
        </Text>

        <Text style={styles.footer} fixed>
          Vesta · Freshness Cascade Platform · vesta.id/impact
        </Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vesta-sertifikat-dampak.pdf"`,
    },
  });
}
