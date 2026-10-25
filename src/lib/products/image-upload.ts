import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "uploads");

export const PRODUCT_IMAGE_DIR = path.join(UPLOAD_ROOT, "products");
export const PRODUCT_IMAGE_URL_PREFIX = "/uploads/products/";

const PRODUCT_IMAGE_NAME_PATTERN = /^[0-9a-f-]+\.(jpg|png|webp|avif)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

type ImageFormat = { extension: string; contentType: string };

function hasAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }

  if (hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WEBP")) {
    return { extension: "webp", contentType: "image/webp" };
  }

  if (
    hasAscii(bytes, 4, "ftyp") &&
    (hasAscii(bytes, 8, "avif") || hasAscii(bytes, 8, "avis"))
  ) {
    return { extension: "avif", contentType: "image/avif" };
  }

  return null;
}

export async function saveProductImage(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return { ok: false, error: "Ukuran foto maksimal 5 MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectImageFormat(bytes);

  if (!format) {
    return {
      ok: false,
      error: "Format foto harus JPG, PNG, WebP, atau AVIF.",
    };
  }

  const fileName = `${randomUUID()}.${format.extension}`;
  await mkdir(PRODUCT_IMAGE_DIR, { recursive: true });
  await writeFile(path.join(PRODUCT_IMAGE_DIR, fileName), bytes);

  return { ok: true, url: `${PRODUCT_IMAGE_URL_PREFIX}${fileName}` };
}

export async function deleteProductImage(url: string | null): Promise<void> {
  if (!url?.startsWith(PRODUCT_IMAGE_URL_PREFIX)) return;

  const fileName = url.slice(PRODUCT_IMAGE_URL_PREFIX.length);
  if (!PRODUCT_IMAGE_NAME_PATTERN.test(fileName)) return;

  try {
    await unlink(path.join(PRODUCT_IMAGE_DIR, fileName));
  } catch {
    // The file may already be gone; the database is the source of truth.
  }
}

export function resolveProductImageFile(fileName: string): string | null {
  if (!PRODUCT_IMAGE_NAME_PATTERN.test(fileName)) return null;
  return path.join(PRODUCT_IMAGE_DIR, fileName);
}

export function contentTypeForProductImage(fileName: string): string | null {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  return CONTENT_TYPES[extension] ?? null;
}
