import { Clock } from "lucide-react";

import { LocketReactionBar } from "@/components/locket/LocketReactionBar";
import { clockTime, timeAgo } from "@/lib/format";
import type { LocketFeedMoment } from "@/lib/locket/feed";

type LocketMomentCardProps = {
  moment: LocketFeedMoment;
  priority?: boolean;
};

/**
 * Mirrors the Locket moment card: photo first with the time pill in the corner
 * and the caption on top of it, then the sender row underneath, then reactions.
 */
export function LocketMomentCard({ moment, priority = false }: LocketMomentCardProps) {
  return (
    <article className="animate-fade-up">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[26px] bg-elevated">
        {moment.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={moment.imageUrl}
            alt={moment.caption ? moment.caption : `Locket from ${moment.authorName}`}
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

        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />

        <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-[3px] text-[11px] font-medium text-white/90 backdrop-blur">
          <Clock size={10} strokeWidth={2.4} />
          {clockTime(moment.createdAt)}
        </span>

        {moment.caption ? (
          <p className="absolute inset-x-6 bottom-5 text-center text-[17px] font-semibold leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            {moment.caption}
          </p>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2 px-1">
        {moment.authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={moment.authorAvatar}
            alt={moment.authorName}
            loading="lazy"
            draggable={false}
            className="h-[22px] w-[22px] shrink-0 rounded-full bg-elevated object-cover"
          />
        ) : (
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B3B40] to-[#1D1D21] text-[9px] font-semibold text-white/80">
            {(moment.authorName || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
          {moment.authorName}
        </span>
        <span className="shrink-0 text-[12px] text-white/35">{timeAgo(moment.createdAt)}</span>
        {moment.isMine ? (
          <span className="ml-auto shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-white/45">
            You
          </span>
        ) : null}
      </div>

      {!moment.isMine && moment.ownerUid ? (
        <LocketReactionBar momentId={moment.id} ownerUid={moment.ownerUid} />
      ) : null}
    </article>
  );
}
