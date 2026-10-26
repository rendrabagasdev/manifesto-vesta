import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cartCount,
  cartSubtotal,
  cartTotalKg,
  readCart,
  readSaved,
  writeCart,
  writeSaved,
  type CartItem,
} from "@/src/lib/marketplace/cart";

class MemoryStorage {
  private store = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.store.set(key, value);
  }
}

const storage = new MemoryStorage();

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    batchId: 1,
    batchCode: "VST-20261023-ABC123",
    productId: 10,
    productName: "Tomat Servo",
    unit: "kg",
    warehouseName: "Gudang Utama Bandung",
    stage: "FRESH",
    pricePerKg: 19500,
    quantityKg: 2,
    maxKg: 100,
    ...overrides,
  };
}

beforeAll(() => {
  vi.stubGlobal("window", {
    localStorage: storage,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  storage.clear();
  storage.failWrites = false;
});

describe("marketplace cart persistence", () => {
  it("starts empty and round-trips cart items", () => {
    expect(readCart()).toEqual([]);

    const lines = [item(), item({ batchId: 2, productName: "Beras", quantityKg: 5 })];
    writeCart(lines);

    expect(readCart()).toEqual(lines);
    expect(cartCount(lines)).toBe(2);
    expect(cartTotalKg(lines)).toBe(7);
    expect(cartSubtotal(lines)).toBe(19500 * 2 + 19500 * 5);
  });

  it("filters malformed entries when reading", () => {
    storage.setItem(
      "vesta-cart-v1",
      JSON.stringify([
        item({ batchId: 1 }),
        { ...item({ batchId: 2 }), quantityKg: 0 },
        { ...item({ batchId: 3 }), batchId: "not-a-number" },
        { ...item({ batchId: 4 }), quantityKg: Number.NaN },
      ]),
    );

    expect(readCart().map((line) => line.batchId)).toEqual([1]);
  });

  it("returns an empty cart for corrupt JSON", () => {
    storage.setItem("vesta-cart-v1", "{not-json");
    expect(readCart()).toEqual([]);
  });

  it("round-trips saved-for-later items", () => {
    expect(readSaved()).toEqual([]);
    writeSaved([
      { productId: 10, productName: "Tomat Servo", unit: "kg", pricePerKg: 19500 },
    ]);

    expect(readSaved()).toHaveLength(1);
    expect(readSaved()[0].productName).toBe("Tomat Servo");
  });

  it("stays usable when localStorage rejects writes", () => {
    storage.failWrites = true;

    expect(() => writeCart([item()])).not.toThrow();
    expect(() =>
      writeSaved([
        { productId: 1, productName: "X", unit: "kg", pricePerKg: 1000 },
      ]),
    ).not.toThrow();
    expect(readCart()).toEqual([]);
  });
});
