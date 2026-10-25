"use client";

export type CartStage = "FRESH" | "RESCUE";

export type CartItem = {
  batchId: number;
  batchCode: string;
  productId: number;
  productName: string;
  unit: string;
  warehouseName: string;
  stage: CartStage;
  pricePerKg: number;
  quantityKg: number;
  maxKg: number;
};

export type SavedItem = {
  productId: number;
  productName: string;
  unit: string;
  pricePerKg: number;
};

const CART_KEY = "vesta-cart-v1";
const SAVED_KEY = "vesta-saved-v1";
const SAVED_EVENT = "vesta-saved-change";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — cart stays in memory only.
  }
}

export function readCart(): CartItem[] {
  return readJson<CartItem[]>(CART_KEY, []).filter(
    (item) =>
      Number.isFinite(item.batchId) &&
      Number.isFinite(item.quantityKg) &&
      item.quantityKg > 0,
  );
}

export function writeCart(items: CartItem[]) {
  writeJson(CART_KEY, items);
}

export function readSaved(): SavedItem[] {
  return readJson<SavedItem[]>(SAVED_KEY, []);
}

export function writeSaved(items: SavedItem[]) {
  writeJson(SAVED_KEY, items);
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function subscribeSaved(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SAVED_KEY) listener();
  };
  window.addEventListener(SAVED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SAVED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function savedSnapshot(): string {
  try {
    return window.localStorage.getItem(SAVED_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function savedServerSnapshot(): string {
  return "[]";
}

export function isSavedInSnapshot(snapshot: string, productId: number): boolean {
  try {
    const entries = JSON.parse(snapshot) as SavedItem[];
    return (
      Array.isArray(entries) &&
      entries.some((entry) => entry.productId === productId)
    );
  } catch {
    return false;
  }
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.pricePerKg * item.quantityKg,
    0,
  );
}

export function cartCount(items: CartItem[]): number {
  return items.length;
}

export function cartTotalKg(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantityKg, 0);
}
