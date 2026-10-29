import Link from "next/link";
import { Heart, MessageCircle, Sparkles } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { PageHeader } from "@/components/PageHeader";
import { RequestActions } from "@/components/friends/RequestActions";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data";
import { mediaUrl, timeAgo } from "@/lib/format";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = getNotifications(user);
  const hasUnreadReactions = items.some(
    (item) => item.kind === "reaction" && item.unread,
  );

  return (
    <div>
      <MarkNotificationsRead unread={hasUnreadReactions} />
      <PageHeader title="Notifications" />

      <main className="px-4 pb-8 pt-4">
        {items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05]">
              <MessageCircle size={26} className="text-white/30" />
            </span>
            <p className="mt-4 text-[16px] font-semibold">No notifications yet</p>
            <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-white/40">
              Reactions and friend requests will show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              if (item.kind === "request") {
                return (
                  <li
                    key={`request-${item.id}`}
                    className="rounded-[22px] border border-white/[0.06] bg-[#111113] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar person={item.person} size={46} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-snug">
                          <span className="font-semibold">{item.person.displayName}</span>{" "}
                          <span className="text-white/50">sent you a friend request</span>
                        </p>
                        <p className="mt-0.5 text-[12px] text-white/35">
                          @{item.person.username} · {timeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <RequestActions fromId={item.person.id} withLabels />
                    </div>
                  </li>
                );
              }

              const momentUrl = mediaUrl(item.momentFile);

              return (
                <li
                  key={`reaction-${item.id}-${item.person.id}-${item.createdAt}`}
                  className="flex items-center gap-3 rounded-[22px] border border-white/[0.05] bg-[#111113] px-3.5 py-3"
                >
                  <div className="relative">
                    <Avatar person={item.person} size={46} />
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#111113] bg-[#242428] text-[12px]">
                      {item.emoji}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">
                      {item.person.displayName}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-white/45">
                      Reacted to your Locket
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-white/30">
                      {timeAgo(item.createdAt)}
                      {item.unread ? (
                        <span className="flex items-center gap-1 text-gold">
                          <Sparkles size={11} /> new
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {momentUrl ? (
                    <Link
                      href="/history"
                      aria-label="Open your history"
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={momentUrl}
                        alt=""
                        className="h-14 w-12 rounded-lg object-cover"
                        loading="lazy"
                      />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 ? (
          <p className="mt-8 flex items-center justify-center gap-1.5 text-[12px] text-white/25">
            <Heart size={12} className="text-gold/70" fill="currentColor" strokeWidth={0} />
            Locket keeps it between friends
          </p>
        ) : null}
      </main>
    </div>
  );
}
