"use client";

import type { FormEvent } from "react";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteBatchAction } from "../actions";
import type { BatchFormState } from "@/src/lib/batches/validation";

const initialState: BatchFormState = {};

export function DeleteBatchButton({
  batchId,
  code,
}: {
  batchId: number;
  code: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteBatchAction,
    initialState,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Hapus batch ${code}? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="batchId" value={batchId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {pending ? "Menghapus..." : "Hapus batch"}
      </button>
      {state.error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
