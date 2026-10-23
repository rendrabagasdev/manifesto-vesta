"use client";

import { useActionState } from "react";
import { BellRing } from "lucide-react";
import { notifyMeAction } from "@/app/(shop)/actions";

const initialState: { ok: boolean; message?: string } = { ok: false };

/** WhatsApp opt-in for rescue deals the buyer's tier cannot access yet. */
export function NotifyMe({ dealId }: { dealId: number }) {
  const [state, formAction, pending] = useActionState(notifyMeAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="dealId" value={dealId} />
      <button
        type="submit"
        disabled={pending || state.ok}
        aria-busy={pending}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
      >
        <BellRing className="size-4" aria-hidden="true" />
        {state.ok ? "Notifikasi aktif" : pending ? "Mengaktifkan..." : "Kabari saya"}
      </button>
      {state.message ? (
        <p className="mt-1.5 text-xs text-ink-muted" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
