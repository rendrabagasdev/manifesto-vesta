"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfileAction,
  type ProfileFormState,
} from "@/app/dashboard/profile/actions";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

export type ProfileFormValues = {
  email: string;
  name: string | null;
  username: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
};

function TextField({
  name,
  label,
  defaultValue,
  hint,
  type = "text",
  required,
  autoComplete,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  hint?: string;
  type?: "text" | "tel";
  required?: boolean;
  autoComplete?: string;
  error?: string[];
}) {
  const id = `profile-${name}`;
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
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${INPUT_CLASS} mt-1.5`}
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

export function ProfileForm({ user }: { user: ProfileFormValues }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {},
  );
  const router = useRouter();
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div
          role="status"
          className="rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-strong"
        >
          {state.success}
        </div>
      ) : null}

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Informasi pribadi</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Dipakai untuk pesanan dan pengiriman.
        </p>

        <div className="mt-4">
          <label htmlFor="profile-email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={user.email}
            readOnly
            disabled
            className={`${INPUT_CLASS} mt-1.5 cursor-not-allowed bg-surface-muted text-ink-muted`}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Email tidak dapat diubah.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label="Nama lengkap"
            defaultValue={user.name}
            autoComplete="name"
            required
            error={errors.name}
          />
          <TextField
            name="username"
            label="Username"
            defaultValue={user.username}
            hint="Opsional, 3-30 karakter."
            autoComplete="username"
            error={errors.username}
          />
          <TextField
            name="phone"
            label="Nomor telepon"
            type="tel"
            defaultValue={user.phone}
            hint="Contoh: 0812 3456 7890"
            autoComplete="tel"
            error={errors.phone}
          />
          <TextField
            name="city"
            label="Kota"
            defaultValue={user.city}
            hint="Contoh: Kota Bandung"
            autoComplete="address-level2"
            error={errors.city}
          />
          <div className="sm:col-span-2">
            <label
              htmlFor="profile-address"
              className="block text-sm font-medium text-ink"
            >
              Alamat
            </label>
            <textarea
              id="profile-address"
              name="address"
              rows={3}
              defaultValue={user.address ?? ""}
              autoComplete="street-address"
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={
                errors.address ? "profile-address-error" : undefined
              }
              className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            {errors.address ? (
              <p
                id="profile-address-error"
                className="mt-1 text-xs text-danger"
              >
                {errors.address[0]}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-strong px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan profil"}
        </button>
      </div>
    </form>
  );
}
