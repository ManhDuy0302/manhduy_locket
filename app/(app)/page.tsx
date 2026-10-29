import Link from "next/link";
import { Camera, Heart, Image as ImageIcon } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { CopyInviteLink } from "@/components/CopyInviteLink";
import { FeedFilter } from "@/components/FeedFilter";
import { LogoMark } from "@/components/Logo";
import { MomentCard } from "@/components/MomentCard";
import { LocketMomentCard } from "@/components/locket/LocketMomentCard";
import { requireUser } from "@/lib/auth";
import { getFeedMoments, getFriendCount } from "@/lib/data";
import { isWithinWindow } from "@/lib/format";
import { loadLocketFeed, type LocketFeedState } from "@/lib/locket/feed";

const RAIN_WINDOW_MS = 20 * 60 * 1000;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await requireUser();
  const { scope } = await searchParams;
  const filter = scope === "mine" ? "mine" : "everyone";
    const friendCount = await getFriendCount(user.id);
    const moments = await getFeedMoments(user.id, filter);
  const locketFeed = await loadLocketFeed(user.id);
  const hasLiveFeed = locketFeed.connected && locketFeed.moments.length > 0;

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 bg-black/75 backdrop-blur-2xl">
        <div className="grid h-[58px] grid-cols-[44px_1fr_44px] items-center px-4">
          <Link href="/" aria-label="Locket home" className="justify-self-start">
            <LogoMark size={32} />
          </Link>
          <div className="flex justify-center">
            <FeedFilter scope={filter} />
          </div>
          <Link href="/profile" aria-label="Your profile" className="justify-self-end">
            <Avatar person={user} size={34} priority />
          </Link>
        </div>
      </header>

      <main className="px-3 pt-4">
        {filter === "everyone" && locketFeed.connected ? (
          <LocketFeedSection state={locketFeed} />
        ) : null}

        {filter === "everyone" && friendCount === 0 && !hasLiveFeed ? (
          <section className="animate-fade-up rounded-[28px] border border-white/[0.07] bg-gradient-to-b from-[#19191C] to-[#111113] px-6 pb-5 pt-7">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
                <Heart size={24} className="text-gold" strokeWidth={2} />
              </span>
              <h2 className="mt-4 text-[19px] font-semibold">Add your best friends</h2>
              <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-white/45">
                Lockets are for your closest people. Add a friend to start sharing photos.
              </p>
              <Link
                href="/friends"
                className="mt-5 flex h-11 items-center justify-center rounded-full bg-gold px-6 text-[15px] font-semibold text-black transition-transform active:scale-[0.98]"
              >
                Add friends
              </Link>
            </div>

            <div className="mt-6 rounded-2xl bg-white/[0.04] p-1.5">
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
                Your invite link
              </p>
              <CopyInviteLink username={user.username} />
            </div>
          </section>
        ) : moments.length === 0 ? (
          hasLiveFeed ? null : <EmptyFeed filter={filter} />
        ) : (
          <div className="space-y-8">
            {hasLiveFeed ? (
              <p className="px-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/25">
                On this device
              </p>
            ) : null}
            {moments.map((moment, index) => {
              const latestReaction = moment.reactions[0];
              const showRain =
                moment.isMine &&
                Boolean(latestReaction) &&
                isWithinWindow(latestReaction.createdAt, RAIN_WINDOW_MS);

              return (
                <MomentCard
                  key={moment.id}
                  moment={moment}
                  showRain={showRain}
                  priority={index === 0}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function LocketFeedSection({ state }: { state: LocketFeedState }) {
  return (
    <section className={state.moments.length > 0 ? "mb-8" : "mb-4"}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Live from Locket
        </span>
        {state.accountLabel ? (
          <span className="truncate text-[11.5px] text-white/30">{state.accountLabel}</span>
        ) : null}
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-amber-100/70">
          {state.error}{" "}
          <Link href="/locket" className="font-semibold underline underline-offset-2">
            Locket settings
          </Link>
        </div>
      ) : state.moments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-[12.5px] text-white/35">
          Your Locket friends haven&apos;t posted anything yet.
        </p>
      ) : (
        <div className="space-y-8">
          {state.moments.map((moment, index) => (
            <LocketMomentCard key={moment.id} moment={moment} priority={index === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyFeed({ filter }: { filter: "everyone" | "mine" }) {
  const mine = filter === "mine";

  return (
    <div className="animate-fade-up flex flex-col items-center rounded-[28px] border border-dashed border-white/[0.09] px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05]">
        {mine ? (
          <ImageIcon size={24} className="text-white/35" />
        ) : (
          <Camera size={24} className="text-white/35" />
        )}
      </span>
      <h2 className="mt-4 text-[17px] font-semibold">
        {mine ? "No Lockets yet" : "Nothing here yet"}
      </h2>
      <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-white/40">
        {mine
          ? "Photos you send will appear here."
          : "When your friends send a photo, it shows up right here."}
      </p>
      <Link
        href="/camera"
        className="mt-5 flex h-11 items-center justify-center rounded-full bg-gold px-6 text-[14px] font-semibold text-black transition-transform active:scale-[0.98]"
      >
        Take a Locket
      </Link>
    </div>
  );
}
