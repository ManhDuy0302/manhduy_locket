import Link from "next/link";
import { Camera, Radio } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { LogoMark } from "@/components/Logo";
import { LocketMomentCard } from "@/components/locket/LocketMomentCard";
import { requireUser } from "@/lib/auth";
import { loadLocketFeed, type LocketFeedState } from "@/lib/locket/feed";
import { getLocketAccount } from "@/lib/locket/store";

/**
 * Home is the real Locket feed: one column of friends' moments, exactly like
 * the app. Everything else (camera, friends, history) hangs off this.
 */
export default async function HomePage() {
  const user = await requireUser();
  const account = await getLocketAccount(user.id);
  const feed = await loadLocketFeed(user.id);

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 bg-black/75 backdrop-blur-2xl">
        <div className="grid h-[58px] grid-cols-[44px_1fr_44px] items-center px-4">
          <Link href="/" aria-label="Locket home" className="justify-self-start">
            <LogoMark size={32} />
          </Link>
          <div className="flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Locket
            </span>
          </div>
          <Link href="/profile" aria-label="Your profile" className="justify-self-end">
            {account?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.avatarUrl}
                alt={account.displayName ?? user.displayName}
                width={34}
                height={34}
                className="h-[34px] w-[34px] rounded-full bg-elevated object-cover"
              />
            ) : (
              <Avatar person={user} size={34} priority />
            )}
          </Link>
        </div>
      </header>

      <main className="px-3 pb-6 pt-4">
        <LocketFeedBody state={feed} />
      </main>
    </div>
  );
}

function LocketFeedBody({ state }: { state: LocketFeedState }) {
  if (!state.connected) {
    return (
      <div className="flex flex-col items-center rounded-[28px] border border-dashed border-white/[0.09] px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
          <Radio size={24} className="text-gold" />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold">Connect your Locket account</h2>
        <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-white/40">
          Your feed comes straight from Locket. Link the account once and it stays connected.
        </p>
        <Link
          href="/login"
          className="mt-5 flex h-11 items-center justify-center rounded-full bg-gold px-6 text-[14px] font-semibold text-black"
        >
          Log in with Locket
        </Link>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-amber-100/70">
        {state.error}{" "}
        <Link href="/locket" className="font-semibold underline underline-offset-2">
          Locket settings
        </Link>
      </div>
    );
  }

  if (state.moments.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[28px] border border-dashed border-white/[0.09] px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05]">
          <Camera size={24} className="text-white/35" />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold">Nothing here yet</h2>
        <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-white/40">
          When your Locket friends send a photo, it shows up right here.
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

  return (
    <div className="space-y-9">
      {state.moments.map((moment, index) => (
        <LocketMomentCard key={moment.id} moment={moment} priority={index === 0} />
      ))}
    </div>
  );
}
