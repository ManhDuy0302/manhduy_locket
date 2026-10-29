import { BottomNav } from "@/components/BottomNav";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requireUser } from "@/lib/auth";
import { getNotificationBadge } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
    const badge = await getNotificationBadge(user);

  return (
    <div className="min-h-dvh bg-black">
      <div className="mx-auto min-h-dvh w-full max-w-[460px] md:border-x md:border-white/[0.04]">
        <div className="pb-28">{children}</div>
        <BottomNav badge={badge} />
        <AutoRefresh />
      </div>
    </div>
  );
}
