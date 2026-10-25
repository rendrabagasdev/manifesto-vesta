"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null };

const fieldClass =
  "h-12 w-full rounded-xl border border-line bg-surface-muted/60 pl-11 pr-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-semibold text-ink">
          Nama lengkap
        </label>
        <div className="relative">
          <UserRound
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Nama kamu"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-ink">
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            placeholder="nama@vesta.id"
            className={fieldClass}
          />
        </div>
      </div>

      <PasswordField
        id="password"
        label="Kata sandi"
        name="password"
        placeholder="Minimal 8 karakter"
        visible={showPassword}
        onToggle={() => setShowPassword((visible) => !visible)}
      />

      <PasswordField
        id="confirmPassword"
        label="Konfirmasi kata sandi"
        name="confirmPassword"
        placeholder="Ulangi kata sandi"
        visible={showConfirmPassword}
        onToggle={() => setShowConfirmPassword((visible) => !visible)}
      />

      {state.error ? (
        <p
          id="register-error"
          role="alert"
          aria-live="polite"
          className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl background-orange px-5 text-sm font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Membuat akun..." : "Daftar"}
      </button>
    </form>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
};

function PasswordField({
  id,
  label,
  name,
  placeholder,
  visible,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={name === "password" ? "new-password" : "new-password"}
          placeholder={placeholder}
          className={`${fieldClass} pr-11`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Sembunyikan ${label.toLowerCase()}` : `Tampilkan ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
