"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import {
  reviewWithdrawalAction,
  type PayoutActionState,
} from "@/app/dashboard/admin/payouts/actions";

export function PayoutReviewForm({ withdrawalId }: { withdrawalId: number }) {
  const [state, formAction, pending] = useActionState<PayoutActionState, FormData>(
    reviewWithdrawalAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2.5">
      <input type="hidden" name="withdrawalId" value={withdrawalId} />
      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs text-danger"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-xs font-medium text-brand-strong">
          {state.success}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="decisionNote"
          type="text"
          placeholder="Catatan keputusan (opsional)"
          maxLength={200}
          className="h-9 min-w-40 flex-1 rounded-lg border border-line bg-surface px-3 text-xs text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <button
          type="submit"
          name="decision"
          value="APPROVED"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-strong px-3.5 text-xs font-semibold text-on-brand transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Check className="size-3.5" aria-hidden="true" />
          Setujui
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECTED"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <X className="size-3.5" aria-hidden="true" />
          Tolak
        </button>
      </div>
    </form>
  );
}
