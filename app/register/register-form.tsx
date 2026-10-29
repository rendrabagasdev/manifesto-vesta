"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Briefcase, Lock, Mail, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null };

const fieldClass =
  "h-12 w-full rounded-xl border border-line bg-surface-muted/60 pl-11 pr-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15";

type AccountType = "CONSUMER" | "BUSINESS";

const ACCOUNT_TYPE_OPTIONS: Array<{
  value: AccountType;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    value: "CONSUMER",
    label: "Individu",
    description: "Belanja harian untuk rumah tangga (B2C)",
    icon: UserRound,
  },
  {
    value: "BUSINESS",
    label: "Bisnis",
    description: "Order grosir, pakan & pre-order (B2B)",
    icon: Briefcase,
  },
];

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const [accountType, setAccountType] = useState<AccountType>("CONSUMER");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isBusiness = accountType === "BUSINESS";

  return (
    <form action={formAction} className="space-y-4">
      <fieldset className="space-y-1.5">
        <legend className="block text-sm font-semibold text-ink">
          Tipe akun
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPE_OPTIONS.map((option) => {
            const checked = accountType === option.value;
            const Icon = option.icon;
            const input = (
              <input
                type="radio"
                name="accountType"
                value={option.value}
                checked={checked}
                onChange={() => setAccountType(option.value)}
                className="peer sr-only"
              />
            );

            return (
              <label
                key={option.value}
                className="relative block cursor-pointer"
              >
                {input}
                <span
                  className={cn(
                    "flex h-full flex-col gap-1 rounded-xl border p-3 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                    checked
                      ? "border-brand bg-surface"
                      : "border-line bg-surface-muted/40 hover:border-brand/50",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "size-4",
                        checked ? "text-brand" : "text-ink-muted",
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-ink">
                      {option.label}
                    </span>
                  </span>
                  <span className="text-xs leading-snug text-ink-muted">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-semibold text-ink">
          {isBusiness ? "Nama usaha" : "Nama lengkap"}
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
            autoComplete={isBusiness ? "organization" : "name"}
            placeholder={isBusiness ? "Nama usaha Anda" : "Nama kamu"}
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
