"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="Email"
        className="h-[52px] w-full rounded-2xl border border-white/[0.06] bg-elevated px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-gold/60"
      />
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        className="h-[52px] w-full rounded-2xl border border-white/[0.06] bg-elevated px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-gold/60"
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
        {pending ? "Logging in…" : "Log in"}
      </button>

      <p className="mt-4 text-center text-[14px] text-white/45">
        New to Locket?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-semibold text-gold"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}
