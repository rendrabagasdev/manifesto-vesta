import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: "ID produk tidak valid" },
        { status: 400 }
      );
    }

    const product = await db.orm.public.Product.where({ id: productId })
      .include("producer", (producer) =>
        producer.select("id", "farmName", "address", "phone"),
      )
      .first();

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get latest batch for this product to show current pricing
    const latestBatch = await db.orm.public.Batch.where({ productId })
      .include("priceBreakdown")
      .include("warehouse", (warehouse) =>
        warehouse.select("id", "name", "city"),
      )
      .orderBy((batch) => batch.createdAt.desc())
      .first();

    const basePrice = product.basePricePerKg;
    const warehouseCost = latestBatch?.priceBreakdown?.warehouseCostPerKg ?? 1000;
    const logisticsCost = latestBatch?.priceBreakdown?.logisticsCostPerKg ?? 1500;
    const margin = latestBatch?.priceBreakdown?.marginPerKg ?? 2000;
    const grossPrice = basePrice + warehouseCost + logisticsCost + margin;

    // Calculate prices for each cascade stage
    const stages = [
      { status: "FRESH", discount: 0, label: "Harga Normal (Segar)" },
      { status: "RESCUE", discount: 35, label: "Penawaran Layu" },
      { status: "FEED", discount: 80, label: "Pakan Ternak" },
      { status: "RESIDUE", discount: 95, label: "Residu Organik" },
      { status: "DISPOSED", discount: 100, label: "Dibuang" },
    ];

    const priceStages = stages.map((stage) => ({
      status: stage.status,
      label: stage.label,
      discountPct: stage.discount,
      pricePerKg: stage.discount === 100 ? 0 : Math.round(grossPrice * (1 - stage.discount / 100)),
    }));

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          unit: product.unit,
          shelfLifeDays: product.shelfLifeDays,
          idealTempC: product.idealTempC,
          basePricePerKg: product.basePricePerKg,
          description: product.description,
        },
        producer: product.producer
          ? {
              id: product.producer.id,
              farmName: product.producer.farmName,
              address: product.producer.address,
              phone: product.producer.phone,
            }
          : null,
        warehouse: latestBatch?.warehouse
          ? {
              id: latestBatch.warehouse.id,
              name: latestBatch.warehouse.name,
              city: latestBatch.warehouse.city,
            }
          : null,
        priceBreakdown: {
          basePricePerKg: basePrice,
          warehouseCostPerKg: warehouseCost,
          logisticsCostPerKg: logisticsCost,
          marginPerKg: margin,
          grossPricePerKg: grossPrice,
        },
        cascadePricing: priceStages,
        currentBatch: latestBatch
          ? {
              id: latestBatch.id,
              code: latestBatch.code,
              freshnessScore: latestBatch.freshnessScore,
              status: latestBatch.status,
              quantityKg: latestBatch.quantityKg,
              reservedKg: latestBatch.reservedKg,
              availableKg: latestBatch.quantityKg - latestBatch.reservedKg,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/products/[id]/breakdown error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil rincian harga" },
      { status: 500 }
    );
  }
}