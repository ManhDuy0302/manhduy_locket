"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";

import {
  completePhoneSignup,
  requestPhoneCode,
  verifyPhoneCode,
} from "@/app/actions/phone-auth";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  formatPhone,
  normalizePhone,
} from "@/lib/phone";

import { CodeInput } from "./CodeInput";

type Step = "phone" | "code" | "profile";

const inputClass =
  "h-[52px] w-full rounded-2xl border border-white/[0.06] bg-elevated px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-gold/60";

const buttonClass =
  "mt-1 flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black transition-transform active:scale-[0.99] disabled:opacity-60";

const RESEND_SECONDS = 45;

export function PhoneAuth({ next }: { next?: string }) {
  const [step, setStep] = useState<Step>("phone");
  const [dial, setDial] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [national, setNational] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeKey, setCodeKey] = useState(0);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [signupToken, setSignupToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const emailHref = next ? `/login/email?next=${encodeURIComponent(next)}` : "/login/email";
  const locketHref = next ? `/login/locket?next=${encodeURIComponent(next)}` : "/login/locket";

  const requestCode = (value: string) => {
    startTransition(async () => {
      const result = await requestPhoneCode(value);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setPhone(result.phone);
      setPreviewCode(result.previewCode);
      setCode("");
      setCodeKey((key) => key + 1);
      setCooldown(RESEND_SECONDS);
      setError(null);
      setStep("code");
    });
  };

  const submitPhone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const canonical = normalizePhone(dial, national);

    if (!canonical) {
      setError("Enter a valid phone number.");
      return;
    }

    requestCode(canonical);
  };

  const verify = (value: string) => {
    startTransition(async () => {
      const result = await verifyPhoneCode(phone, value, next ?? null);

      if (!result.ok) {
        setError(result.error);
        setCode("");
        setCodeKey((key) => key + 1);
        return;
      }

      if (!result.existing) {
        setSignupToken(result.signupToken);
        setError(null);
        setStep("profile");
      }
    });
  };

  const handleCode = (value: string) => {
    setCode(value);
    setError(null);

    if (value.length === 6) {
      verify(value);
    }
  };

  const resend = () => {
    if (pending || cooldown > 0) {
      return;
    }

    requestCode(phone);
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await completePhoneSignup({
        phone,
        token: signupToken,
        displayName: String(form.get("displayName") ?? ""),
        username: String(form.get("username") ?? ""),
        next: next ?? null,
      });

      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  if (step === "code") {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setError(null);
            setCode("");
          }}
          className="-ml-2 flex w-fit items-center gap-1 text-[14px] font-medium text-white/45"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
          Change number
        </button>

        <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.01em]">
          Enter the code
        </h2>
        <p className="mb-1 text-[14px] leading-relaxed text-white/40">
          We sent a 6-digit code to {formatPhone(phone)}.
        </p>

        <CodeInput
          key={codeKey}
          value={code}
          onChange={handleCode}
          disabled={pending}
        />

        {previewCode ? (
          <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold/70">
              SMS is not set up
            </p>
            <p className="mt-1 text-[14px] text-white/60">
              Code for this server:{" "}
              <span className="font-semibold tracking-[0.18em] text-white">
                {previewCode}
              </span>
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="px-1 text-[13px] text-red-400">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex items-center justify-center">
          {pending ? (
            <span className="flex items-center gap-2 text-[14px] text-white/40">
              <Loader2 size={15} className="animate-spin" />
              Verifying…
            </span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0}
              className="text-[14px] font-medium text-gold disabled:text-white/35"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <form onSubmit={submitProfile} className="flex flex-col gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
          Create your Locket
        </h2>
        <p className="mb-1 text-[14px] leading-relaxed text-white/40">
          Pick the name and @username your friends will see.
        </p>

        <input
          name="displayName"
          required
          maxLength={30}
          autoComplete="name"
          placeholder="Your name"
          autoFocus
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

        {error ? (
          <p role="alert" className="px-1 text-[13px] text-red-400">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitPhone} className="flex flex-col gap-3">
      <label
        htmlFor="phone-number"
        className="px-1 text-[13px] font-medium text-white/45"
      >
        My number is
      </label>

      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={dial}
          onChange={(event) => setDial(event.target.value)}
          className="h-[52px] w-[112px] shrink-0 rounded-2xl border border-white/[0.06] bg-elevated px-3 text-[15px] text-white outline-none focus:border-gold/60"
        >
          {COUNTRY_CODES.map((country) => (
            <option
              key={country.country}
              value={country.code}
              className="bg-[#17171A]"
            >
              {country.country} {country.code}
            </option>
          ))}
        </select>

        <input
          id="phone-number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Phone number"
          value={national}
          onChange={(event) => {
            setNational(event.target.value.replace(/[^\d\s]/g, ""));
            setError(null);
          }}
          className={`${inputClass} flex-1`}
        />
      </div>

      {error ? (
        <p role="alert" className="px-1 text-[13px] text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || national.replace(/\D/g, "").length < 6}
        className={buttonClass}
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : null}
        Continue
      </button>

      <p className="mt-1 text-center text-[12px] leading-relaxed text-white/30">
        We&apos;ll text you a 6-digit code to sign in or create your account.
      </p>

      <p className="mt-3 text-center text-[14px] text-white/45">
        <Link href={locketHref} className="font-semibold text-gold">
          Log in with Locket account
        </Link>
      </p>

      <p className="mt-2 text-center text-[14px] text-white/45">
        <Link href={emailHref} className="font-semibold text-white/60">
          Log in with email
        </Link>
      </p>
    </form>
  );
}
