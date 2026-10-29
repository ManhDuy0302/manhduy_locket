import { Clock } from "lucide-react";

import { LocketReactionBar } from "@/components/locket/LocketReactionBar";
import { clockTime, timeAgo } from "@/lib/format";
import type { LocketFeedMoment } from "@/lib/locket/feed";

type LocketMomentCardProps = {
  moment: LocketFeedMoment;
  priority?: boolean;
};

export function LocketMomentCard({ moment, priority = false }: LocketMomentCardProps) {
  return (
    <article className="animate-fade-up">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[30px] bg-elevated">
        {moment.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={moment.imageUrl}
            alt={
              moment.caption
                ? moment.caption
                : `Locket from ${moment.authorName}`
            }
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            draggable={false}
            className="h-full w-full select-none object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-[13px] text-white/35">
            This Locket has no photo on the CDN.
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />

        {moment.caption ? (
          <p className="absolute inset-x-5 bottom-12 z-20 line-clamp-3 text-center text-[16px] font-semibold leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
            {moment.caption}
          </p>
        ) : null}

        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9C8CF0]/85 to-[#E2A6D8]/85 px-3 py-1 text-[12px] font-medium text-white shadow-[0_4px_18px_rgba(0,0,0,0.25)] backdrop-blur-sm">
            <Clock size={12} strokeWidth={2.2} />
            {clockTime(moment.createdAt)}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-center gap-2">
        {moment.authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={moment.authorAvatar}
            alt={moment.authorName}
            loading="lazy"
            draggable={false}
            className="h-[26px] w-[26px] shrink-0 rounded-full bg-elevated object-cover"
          />
        ) : (
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B3B40] to-[#1D1D21] text-[10px] font-semibold text-white/80">
            {(moment.authorName || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-[15px] font-semibold tracking-[-0.01em]">{moment.authorName}</span>
        <span className="text-[13px] text-white/40">{timeAgo(moment.createdAt)}</span>
      </div>

      {!moment.isMine && moment.ownerUid ? (
        <LocketReactionBar momentId={moment.id} ownerUid={moment.ownerUid} />
      ) : null}
    </article>
  );
}
