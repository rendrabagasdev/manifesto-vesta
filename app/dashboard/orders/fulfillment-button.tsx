"use client";

import { useActionState } from "react";
import { CheckCircle2, Truck } from "lucide-react";
import {
  completeOrderAction,
  shipOrderAction,
  type FulfillmentActionState,
} from "./actions";

const initialState: FulfillmentActionState = {};

export function FulfillmentButton({
  orderId,
  status,
}: {
  orderId: number;
  status: "PAID" | "SHIPPED";
}) {
  const action = status === "PAID" ? shipOrderAction : completeOrderAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const Icon = status === "PAID" ? Truck : CheckCircle2;

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-strong px-3.5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon className="size-4" aria-hidden="true" />
        {pending
          ? "Memproses..."
          : status === "PAID"
            ? "Kirim pesanan"
            : "Selesaikan"}
      </button>
      {state.error ? (
        <p role="alert" className="mt-2 max-w-56 text-xs font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-2 max-w-56 text-xs font-medium text-brand-strong">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
