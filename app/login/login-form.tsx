"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-ink"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="nama@vesta.id"
          className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-ink"
        >
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Masukkan kata sandi"
          className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </div>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          aria-live="polite"
          className="rounded-lg bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Memeriksa akun..." : "Masuk"}
      </button>
    </form>
  );
}
