"use client";

import type { FormEvent } from "react";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteProductAction } from "./actions";
import type { ProductFormState } from "@/src/lib/products/validation";

const initialState: ProductFormState = {};

export function DeleteProductButton({
  productId,
  name,
}: {
  productId: number;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteProductAction,
    initialState,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Hapus produk ${name}? Produk yang masih dipakai batch tidak dapat dihapus.`,
    );
    if (!confirmed) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      {state.error ? (
        <p role="alert" className="mt-2 max-w-56 text-xs font-medium text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
