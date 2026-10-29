"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction } from "@/app/actions/auth";

const inputClass =
  "h-[52px] w-full rounded-2xl border border-white/[0.06] bg-elevated px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-gold/60";

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input
        name="displayName"
        required
        maxLength={30}
        autoComplete="name"
        placeholder="Your name"
        className={inputClass}
      />
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-white/35">
          @
        </span>
        <input
          name="username"
          required
          minLength={3}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="username"
          className={`${inputClass} pl-9`}
        />
      </div>
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="Email"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Password (8+ characters)"
        className={inputClass}
      />

      {state.error ? (
        <p role="alert" className="px-1 text-[13px] text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-[52px] items-center justify-center rounded-2xl bg-gold text-[15px] font-semibold text-black transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="mt-4 text-center text-[14px] text-white/45">
        Already on Locket?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-semibold text-gold"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
