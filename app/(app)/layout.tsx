import { AutoRefresh } from "@/components/AutoRefresh";
import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-dvh bg-black">
      <div className="mx-auto min-h-dvh w-full max-w-[460px] md:border-x md:border-white/[0.04]">
        <div className="pb-28">{children}</div>
        <BottomNav />
        <AutoRefresh />
      </div>
    </div>
  );
}
