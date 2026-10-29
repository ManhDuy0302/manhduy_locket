import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/SignUpForm";
import { LogoMark } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const { next } = await searchParams;

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-6">
      <div className="flex flex-1 flex-col justify-center pb-12 pt-8">
        <div className="mb-8 flex flex-col items-center">
          <LogoMark size={60} />
          <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em]">
            Create your Locket
          </h1>
          <p className="mt-1.5 text-[14px] text-white/40">Best friends first.</p>
        </div>
        <SignUpForm next={next} />
      </div>
    </main>
  );
}
