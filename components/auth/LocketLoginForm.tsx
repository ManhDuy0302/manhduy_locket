"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { locketSignInAction } from "@/app/actions/locket-login";

const inputClass =
  "h-[52px] w-full rounded-2xl border border-white/[0.06] bg-elevated px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-gold/60";

type LocketLoginFormProps = {
  next?: string;
  configured: boolean;
};

export function LocketLoginForm({ next, configured }: LocketLoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await locketSignInAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setError(null);
      router.replace(next && next.startsWith("/") ? next : "/");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="locket-identifier" className="px-1 text-[13px] font-medium text-white/45">
        Your Locket account
      </label>

      <input
        id="locket-identifier"
        name="identifier"
        required
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Email or +84 phone number"
        className={inputClass}
      />

      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        className={inputClass}
      />

      {!configured ? (
        <p className="px-1 text-[12.5px] leading-relaxed text-amber-200/70">
          This server isn&apos;t connected to Locket yet. Ask the site owner to add the Firebase key.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="px-1 text-[13px] text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !configured}
        className="mt-1 flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Log in with Locket"}
      </button>

      <p className="mt-1 text-center text-[12px] leading-relaxed text-white/30">
        Your password goes straight to Locket&apos;s Firebase login and is never stored here.
      </p>

      <p className="mt-3 text-center text-[14px] text-white/45">
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-gold">
          Use phone or email instead
        </Link>
      </p>
    </form>
  );
}
