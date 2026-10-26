"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface CartItem {
  batchId: number;
  batchCode: string;
  productName: string;
  unit: string;
  pricePerKg: number;
  qtyKg: number;
  maxKg: number;
  stage: string;
  warehouseName: string;
  warehouseCity: string | null;
}

const STORAGE_KEY = "vesta-cart-v1";

interface CartContextValue {
  items: CartItem[];
  ready: boolean;
  totalKg: number;
  subtotal: number;
  count: number;
  addItem: (item: CartItem) => { ok: boolean; message: string };
  updateQty: (batchId: number, qtyKg: number) => void;
  removeItem: (batchId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function sanitizeItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CartItem[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as CartItem).batchId === "number" &&
      typeof (entry as CartItem).pricePerKg === "number" &&
      typeof (entry as CartItem).qtyKg === "number"
    ) {
      const item = entry as CartItem;
      if (item.qtyKg > 0 && item.maxKg > 0) {
        items.push({
          ...item,
          warehouseCity:
            typeof item.warehouseCity === "string" ? item.warehouseCity : null,
          qtyKg: Math.min(item.qtyKg, item.maxKg),
        });
      }
    }
  }
  return items;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Hydration-safe: persisted cart is loaded after mount so the first client render matches the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setItems(sanitizeItems(JSON.parse(stored)));
    } catch {
      // Corrupted storage starts as an empty cart.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or unavailable; cart stays in memory.
    }
  }, [items, ready]);

  const addItem = useCallback((item: CartItem) => {
    let result = { ok: true, message: "Ditambahkan ke keranjang." };

    setItems((current) => {
      const existing = current.find((entry) => entry.batchId === item.batchId);
      if (existing) {
        const nextQty = existing.qtyKg + item.qtyKg;
        if (nextQty > item.maxKg) {
          result = {
            ok: false,
            message: `Stok ${item.productName} tersisa ${item.maxKg} ${item.unit}.`,
          };
          return current.map((entry) =>
            entry.batchId === item.batchId
              ? { ...entry, qtyKg: item.maxKg }
              : entry,
          );
        }
        return current.map((entry) =>
          entry.batchId === item.batchId ? { ...entry, qtyKg: nextQty } : entry,
        );
      }
      if (item.qtyKg > item.maxKg) {
        result = {
          ok: false,
          message: `Stok ${item.productName} tersisa ${item.maxKg} ${item.unit}.`,
        };
        return [...current, { ...item, qtyKg: item.maxKg }];
      }
      return [...current, item];
    });

    return result;
  }, []);

  const updateQty = useCallback((batchId: number, qtyKg: number) => {
    setItems((current) =>
      current
        .map((entry) =>
          entry.batchId === batchId
            ? { ...entry, qtyKg: Math.min(Math.max(0, qtyKg), entry.maxKg) }
            : entry,
        )
        .filter((entry) => entry.qtyKg > 0),
    );
  }, []);

  const removeItem = useCallback((batchId: number) => {
    setItems((current) => current.filter((entry) => entry.batchId !== batchId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const totalKg = items.reduce((sum, item) => sum + item.qtyKg, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.qtyKg * item.pricePerKg,
      0,
    );
    return {
      items,
      ready,
      totalKg,
      subtotal,
      count: items.length,
      addItem,
      updateQty,
      removeItem,
      clear,
    };
  }, [items, ready, addItem, updateQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart harus dipakai di dalam CartProvider");
  }
  return context;
}
