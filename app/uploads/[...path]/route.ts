import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  contentTypeForProductImage,
  resolveProductImageFile,
} from "@/src/lib/products/image-upload";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (segments?.length !== 2 || segments[0] !== "products") {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileName = segments[1];
  const filePath = resolveProductImageFile(fileName);
  const contentType = contentTypeForProductImage(fileName);

  if (!filePath || !contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(file.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
