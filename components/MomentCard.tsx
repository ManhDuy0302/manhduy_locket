import { Clock } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { ReactionBar } from "@/components/ReactionBar";
import { ReactionRain } from "@/components/ReactionRain";
import type { Moment } from "@/lib/data";
import { clockTime, mediaUrl, timeAgo } from "@/lib/format";

type MomentCardProps = {
  moment: Moment;
  showRain?: boolean;
  priority?: boolean;
};

export function MomentCard({ moment, showRain = false, priority = false }: MomentCardProps) {
  const image = mediaUrl(moment.imageFile);
  const uniqueEmojis = Array.from(new Set(moment.reactions.map((reaction) => reaction.emoji)));
  const rainEmojis = showRain
    ? moment.reactions.slice(0, 7).map((reaction) => reaction.emoji)
    : [];
  const reactionNames = moment.reactions
    .slice(0, 2)
    .map((reaction) => reaction.person.displayName.split(" ")[0]);
  const moreReactions = moment.reactions.length - reactionNames.length;

  return (
    <article className="animate-fade-up">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[30px] bg-elevated">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={`Locket from ${moment.author.displayName}`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            draggable={false}
            className="h-full w-full select-none object-cover"
          />
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />

        <ReactionRain emojis={rainEmojis} />

        {uniqueEmojis.length > 0 ? (
          <div className="absolute right-3 top-3 z-20 flex -space-x-1.5">
            {uniqueEmojis.slice(0, 3).map((emoji, index) => (
              <span
                key={`${emoji}-${index}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/55 text-[15px] backdrop-blur"
              >
                {emoji}
              </span>
            ))}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9C8CF0]/85 to-[#E2A6D8]/85 px-3 py-1 text-[12px] font-medium text-white shadow-[0_4px_18px_rgba(0,0,0,0.25)] backdrop-blur-sm">
            <Clock size={12} strokeWidth={2.2} />
            {clockTime(moment.createdAt)}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-center gap-2">
        <Avatar person={moment.author} size={26} />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {moment.author.displayName}
        </span>
        <span className="text-[13px] text-white/40">{timeAgo(moment.createdAt)}</span>
      </div>

      {moment.isMine ? (
        moment.reactions.length > 0 ? (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] text-white/45">
            {uniqueEmojis.slice(0, 3).map((emoji) => (
              <span key={emoji} className="text-[15px]">
                {emoji}
              </span>
            ))}
            <span>
              {reactionNames.join(", ")}
              {moreReactions > 0 ? ` +${moreReactions}` : ""}
            </span>
          </div>
        ) : null
      ) : (
        <ReactionBar
          momentId={moment.id}
          initialEmoji={moment.myReaction}
          authorName={moment.author.displayName.split(" ")[0]}
        />
      )}
    </article>
  );
}
