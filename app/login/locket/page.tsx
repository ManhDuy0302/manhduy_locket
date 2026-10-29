import { redirect } from "next/navigation";

import { LocketLoginForm } from "@/components/auth/LocketLoginForm";
import { LogoMark } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { describeLocketConfig } from "@/lib/locket/config";

export default async function LocketLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const { next } = await searchParams;
  const setup = describeLocketConfig();

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-6">
      <div className="flex flex-1 flex-col justify-center pb-16">
        <div className="mb-9 flex flex-col items-center">
          <LogoMark size={72} />
          <h1 className="mt-5 text-[34px] font-semibold tracking-[-0.03em]">Locket</h1>
          <p className="mt-1.5 text-center text-[14px] text-white/40">
            Log in with the account you already use in the Locket app.
          </p>
        </div>

        <LocketLoginForm next={next} configured={setup.ready} />
      </div>
    </main>
  );
}
