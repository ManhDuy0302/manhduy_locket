import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { LoginForm } from "@/components/auth/LoginForm";
import { LogoMark } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export default async function EmailLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const { next } = await searchParams;
  const phoneHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-6">
      <div className="flex flex-1 flex-col justify-center pb-16">
        <Link
          href={phoneHref}
          className="-ml-2 mb-8 flex w-fit items-center gap-1 text-[14px] font-medium text-white/45"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
          Phone number
        </Link>

        <div className="mb-8 flex flex-col items-center">
          <LogoMark size={56} />
          <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.02em]">
            Log in with email
          </h1>
          <p className="mt-1.5 text-[14px] text-white/40">
            For accounts created with an email address.
          </p>
        </div>

        <LoginForm next={next} />
      </div>
    </main>
  );
}
