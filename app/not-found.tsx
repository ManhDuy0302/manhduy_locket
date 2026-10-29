import Link from "next/link";

import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-[460px] flex-col items-center justify-center px-6 text-center">
      <LogoMark size={56} />
      <h1 className="mt-5 text-[21px] font-semibold">Nothing here</h1>
      <p className="mt-2 max-w-[260px] text-[14px] leading-relaxed text-white/40">
        This page doesn&apos;t exist — but your friends do.
      </p>
      <Link
        href="/"
        className="mt-6 flex h-11 items-center justify-center rounded-full bg-gold px-6 text-[14px] font-semibold text-black"
      >
        Back to Locket
      </Link>
    </main>
  );
}
