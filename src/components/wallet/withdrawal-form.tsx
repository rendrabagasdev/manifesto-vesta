"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import {
  requestWithdrawalAction,
  type WalletActionState,
} from "@/app/dashboard/wallet/actions";
import { formatIdr } from "@/src/lib/batches/format";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

export type WithdrawalFormProps = {
  balance: number;
};

function Field({
  name,
  label,
  hint,
  error,
  inputProps,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string[];
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const id = `withdrawal-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${INPUT_CLASS} mt-1.5`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-danger">
          {error[0]}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function WithdrawalForm({ balance }: WithdrawalFormProps) {
  const [state, formAction, pending] = useActionState<WalletActionState, FormData>(
    requestWithdrawalAction,
    {},
  );
  const errors = state.fieldErrors ?? {};
  const insufficient = state.error?.includes("Saldo tidak cukup");

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-strong"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.success}
        </div>
      ) : null}

      <Field
        name="amount"
        label="Jumlah penarikan (Rp)"
        hint={`Saldo tersedia ${formatIdr(balance)}`}
        error={errors.amount ?? (insufficient ? ["Jumlah melebihi saldo tersedia."] : undefined)}
        inputProps={{
          type: "number",
          min: 10000,
          step: 1,
          required: true,
          defaultValue: "",
          inputMode: "numeric",
          className: INPUT_CLASS,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="bankName"
          label="Nama bank"
          error={errors.bankName}
          inputProps={{
            required: true,
            placeholder: "BCA",
            maxLength: 60,
            className: INPUT_CLASS,
          }}
        />
        <Field
          name="bankAccountNumber"
          label="Nomor rekening"
          error={errors.bankAccountNumber}
          inputProps={{
            required: true,
            placeholder: "1234567890",
            inputMode: "numeric",
            pattern: "[0-9]{6,20}",
            maxLength: 20,
            className: INPUT_CLASS,
          }}
        />
      </div>

      <Field
        name="bankAccountName"
        label="Nama pemilik rekening"
        error={errors.bankAccountName}
        inputProps={{
          required: true,
          placeholder: "Nama sesuai rekening",
          maxLength: 80,
          className: INPUT_CLASS,
        }}
      />

      <Field
        name="note"
        label="Catatan (opsional)"
        error={errors.note}
        inputProps={{
          maxLength: 200,
          className: INPUT_CLASS,
        }}
      />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Send className="size-4" aria-hidden="true" />
        {pending ? "Mengirim…" : "Ajukan penarikan"}
      </button>
    </form>
  );
}
