import Link from "next/link";
import { Heart, Radio, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { loadLocketFriends, type LocketFriendsState } from "@/lib/locket/feed";

/**
 * Friends comes straight from the real Locket account (Firestore), so there is
 * nothing to add or accept here — it mirrors the app.
 */
export default async function FriendsPage() {
  const user = await requireUser();
  const state = await loadLocketFriends(user.id);

  return (
    <div>
      <PageHeader title="Friends" backHref="/" />

      <main className="px-4 pb-8 pt-6">
        <div className="text-center">
          <h2 className="flex items-center justify-center gap-2 text-[24px] font-semibold tracking-[-0.02em]">
            <Heart size={20} className="text-gold" fill="currentColor" strokeWidth={0} />
            {state.connected
              ? `${state.friends.length} ${state.friends.length === 1 ? "Friend" : "Friends"}`
              : "Friends"}
          </h2>
          <p className="mt-1 text-[13px] text-white/45">
            Your <span className="font-medium text-gold">best friends</span> on Locket
          </p>
        </div>

        <FriendsBody state={state} />
      </main>
    </div>
  );
}

function FriendsBody({ state }: { state: LocketFriendsState }) {
  if (!state.connected) {
    return (
      <div className="mt-8 flex flex-col items-center rounded-[26px] border border-dashed border-white/[0.09] px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
          <Radio size={24} className="text-gold" />
        </span>
        <p className="mt-4 text-[16px] font-semibold">Not connected yet</p>
        <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-white/40">
          Log in with your Locket account to see the friends you already have.
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
      <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-amber-100/70">
        {state.error}{" "}
        <Link href="/locket" className="font-semibold underline underline-offset-2">
          Locket settings
        </Link>
      </div>
    );
  }

  if (state.friends.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center rounded-[26px] border border-dashed border-white/[0.08] px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05]">
          <UsersRound size={24} className="text-white/35" />
        </span>
        <p className="mt-4 text-[16px] font-semibold">No Locket friends yet</p>
        <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-white/40">
          Add friends in the Locket app — they show up here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7 grid grid-cols-3 gap-y-6">
      {state.friends.map((friend) => (
        <div key={friend.uid} className="flex flex-col items-center gap-2">
          {friend.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={friend.avatarUrl}
              alt={friend.name}
              loading="lazy"
              draggable={false}
              className="h-[78px] w-[78px] rounded-full bg-elevated object-cover"
            />
          ) : (
            <span className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-gradient-to-br from-[#3B3B40] to-[#1D1D21] text-[24px] font-semibold text-white/75">
              {(friend.name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="max-w-full truncate px-1 text-[13px] font-medium">
            {friend.name}
          </span>
          {friend.username ? (
            <span className="max-w-full truncate px-1 text-[11px] text-white/35">
              @{friend.username}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
