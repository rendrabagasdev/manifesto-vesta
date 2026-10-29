"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cartSubtotal,
  readCart,
  readSaved,
  writeCart,
  writeSaved,
  type CartItem,
  type CartStage,
  type SavedItem,
} from "@/src/lib/marketplace/cart";

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  subtotal: number;
  totalKg: number;
  addItem: (item: Omit<CartItem, "quantityKg">, quantityKg: number) => void;
  setQuantity: (batchId: number, quantityKg: number) => void;
  removeItem: (batchId: number) => void;
  clearCart: () => void;
  saved: SavedItem[];
  toggleSaved: (item: SavedItem) => boolean;
  isSaved: (productId: number) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydration-safe: persisted cart is loaded after mount so the first client render matches the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readCart());
    setSaved(readSaved());
    setReady(true);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    writeCart(next);
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantityKg">, quantityKg: number) => {
      const safeQty = Math.max(0, Math.min(quantityKg, item.maxKg));
      if (safeQty <= 0) return;
      const existing = items.find((entry) => entry.batchId === item.batchId);
      const next = existing
        ? items.map((entry) =>
            entry.batchId === item.batchId
              ? {
                  ...entry,
                  quantityKg: Math.min(
                    entry.quantityKg + safeQty,
                    entry.maxKg,
                  ),
                }
              : entry,
          )
        : [...items, { ...item, quantityKg: safeQty }];
      persist(next);
    },
    [items, persist],
  );

  const setQuantity = useCallback(
    (batchId: number, quantityKg: number) => {
      persist(
        items
          .map((entry) =>
            entry.batchId === batchId
              ? {
                  ...entry,
                  quantityKg: Math.max(
                    0,
                    Math.min(quantityKg, entry.maxKg),
                  ),
                }
              : entry,
          )
          .filter((entry) => entry.quantityKg > 0),
      );
    },
    [items, persist],
  );

  const removeItem = useCallback(
    (batchId: number) => {
      persist(items.filter((entry) => entry.batchId !== batchId));
    },
    [items, persist],
  );

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  const toggleSaved = useCallback(
    (item: SavedItem) => {
      const exists = saved.some((entry) => entry.productId === item.productId);
      const next = exists
        ? saved.filter((entry) => entry.productId !== item.productId)
        : [...saved, item];
      setSaved(next);
      writeSaved(next);
      return !exists;
    },
    [saved],
  );

  const isSaved = useCallback(
    (productId: number) =>
      saved.some((entry) => entry.productId === productId),
    [saved],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      subtotal: cartSubtotal(items),
      totalKg: items.reduce((sum, item) => sum + item.quantityKg, 0),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      saved,
      toggleSaved,
      isSaved,
    }),
    [
      items,
      ready,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      saved,
      toggleSaved,
      isSaved,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart harus dipakai di dalam CartProvider");
  }
  return context;
}

export type { CartItem, CartStage, SavedItem };
