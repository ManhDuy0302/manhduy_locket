import { Camera } from "lucide-react";
import Link from "next/link";

import { HistoryGrid, type HistoryGroup } from "@/components/history/HistoryGrid";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { getHistoryMoments } from "@/lib/data";
import { dayLabel, mediaUrl } from "@/lib/format";

export default async function HistoryPage() {
  const user = await requireUser();
  const moments = getHistoryMoments(user.id);

  const grouped = new Map<string, HistoryGroup>();

  for (const moment of moments) {
    const url = mediaUrl(moment.imageFile);

    if (!url) {
      continue;
    }

    const key = new Date(moment.createdAt).toDateString();
    const group = grouped.get(key) ?? { label: dayLabel(moment.createdAt), photos: [] };
    group.photos.push({ id: moment.id, url, createdAt: moment.createdAt });
    grouped.set(key, group);
  }

  const groups = Array.from(grouped.values());

  return (
    <div>
      <PageHeader title="History" backHref="/" />

      <main className="px-3 pt-4">
        {groups.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05]">
              <Camera size={26} className="text-white/30" />
            </span>
            <p className="mt-4 text-[16px] font-semibold">Your Lockets live here</p>
            <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-white/40">
              Every photo you send is saved to your history.
            </p>
            <Link
              href="/camera"
              className="mt-5 flex h-11 items-center justify-center rounded-full bg-gold px-6 text-[14px] font-semibold text-black"
            >
              Take a Locket
            </Link>
          </div>
        ) : (
          <>
            <p className="px-1 pb-4 text-[13px] text-white/35">
              {moments.length} {moments.length === 1 ? "Locket" : "Lockets"} sent
            </p>
            <HistoryGrid groups={groups} />
          </>
        )}
      </main>
    </div>
  );
}
