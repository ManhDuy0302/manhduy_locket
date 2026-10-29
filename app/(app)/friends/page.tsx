import Link from "next/link";
import { Heart, Search, Sparkles, UsersRound } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { CopyInviteLink } from "@/components/CopyInviteLink";
import { FriendResultActions, type FriendStatus } from "@/components/friends/FriendResultActions";
import { FriendTile } from "@/components/friends/FriendTile";
import { RequestActions } from "@/components/friends/RequestActions";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import {
  getFriends,
  getIncomingRequests,
  getRelationships,
  MAX_FRIENDS,
  searchUsers,
} from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { loadLocketFriends } from "@/lib/locket/feed";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

    const friends = await getFriends(user.id);
    const requests = await getIncomingRequests(user.id);
    const relationships = await getRelationships(user.id);
    const results = query ? await searchUsers(user.id, query) : [];
  const locketFriends = await loadLocketFriends(user.id);

  const statusFor = (id: string): FriendStatus => {
    if (relationships.friends.has(id)) {
      return "friend";
    }

    if (relationships.incoming.has(id)) {
      return "incoming";
    }

    if (relationships.outgoing.has(id)) {
      return "outgoing";
    }

    return "none";
  };

  return (
    <div>
      <PageHeader title="Friends" backHref="/" />

      <main className="px-4 pb-8 pt-6">
        <div className="text-center">
          <h2 className="flex items-center justify-center gap-2 text-[24px] font-semibold tracking-[-0.02em]">
            <Heart size={20} className="text-gold" fill="currentColor" strokeWidth={0} />
            {friends.length} {friends.length === 1 ? "Friend" : "Friends"}
          </h2>
          <p className="mt-1 text-[13px] text-white/45">
            Add your <span className="font-medium text-gold">best friends</span>
          </p>
          {friends.length >= MAX_FRIENDS ? (
            <p className="mt-2 text-[12px] text-white/30">
              Locket keeps it close — {MAX_FRIENDS} friends max.
            </p>
          ) : null}
        </div>

        <form
          action="/friends"
          method="get"
          id="add-friend"
          className="mt-6 flex h-12 items-center gap-2 rounded-full bg-elevated pl-4 pr-1.5 ring-1 ring-white/[0.05] focus-within:ring-gold/40"
        >
          <Search size={18} className="shrink-0 text-white/35" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Add a new friend"
            aria-label="Search by username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-full bg-white/[0.08] px-4 text-[13px] font-semibold text-white/80"
          >
            Search
          </button>
        </form>

        {query ? (
          <section className="mt-4 rounded-[22px] border border-white/[0.06] bg-[#111113] p-2">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] leading-relaxed text-white/40">
                No one matches “{query}”. Ask your friend for their exact username.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {results.map((person) => (
                  <li key={person.id} className="flex items-center gap-3 px-2 py-2.5">
                    <Avatar person={person} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">
                        {person.displayName}
                      </p>
                      <p className="truncate text-[12px] text-white/40">
                        @{person.username}
                      </p>
                    </div>
                    <FriendResultActions person={person} status={statusFor(person.id)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {requests.length > 0 ? (
          <section className="mt-6">
            <SectionLabel icon={<Sparkles size={14} className="text-gold" />}>
              Friend requests
            </SectionLabel>
            <ul className="mt-2.5 space-y-2">
              {requests.map((request) => (
                <li
                  key={request.person.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.045] px-3 py-2.5"
                >
                  <Avatar person={request.person} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {request.person.displayName}
                    </p>
                    <p className="text-[12px] text-white/40">
                      @{request.person.username} · {timeAgo(request.createdAt)}
                    </p>
                  </div>
                  <RequestActions fromId={request.person.id} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {locketFriends.connected ? (
          <section className="mt-7">
            <SectionLabel icon={<Sparkles size={14} className="text-gold" />}>
              Locket friends
            </SectionLabel>

            {locketFriends.error ? (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-amber-100/70">
                {locketFriends.error}{" "}
                <Link href="/locket" className="font-semibold underline underline-offset-2">
                  Locket settings
                </Link>
              </div>
            ) : locketFriends.friends.length === 0 ? (
              <p className="mt-3 rounded-[22px] border border-dashed border-white/[0.08] px-5 py-6 text-center text-[12.5px] text-white/35">
                No friends on your real Locket account yet.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-y-5">
                {locketFriends.friends.map((friend) => (
                  <div key={friend.uid} className="flex flex-col items-center gap-2">
                    {friend.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={friend.avatarUrl}
                        alt={friend.name}
                        loading="lazy"
                        draggable={false}
                        className="h-[76px] w-[76px] rounded-full bg-elevated object-cover"
                      />
                    ) : (
                      <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-gradient-to-br from-[#3B3B40] to-[#1D1D21] text-[24px] font-semibold text-white/75">
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
            )}
          </section>
        ) : null}

        <section className="mt-7">
          <SectionLabel icon={<UsersRound size={14} />}>Your friends</SectionLabel>

          {friends.length === 0 ? (
            <div className="mt-3 rounded-[22px] border border-dashed border-white/[0.08] px-5 py-8 text-center">
              <p className="text-[14px] font-medium text-white/70">No friends yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/35">
                Share your link below so a friend can add you.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-y-5">
              <a
                href="#add-friend"
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-dashed border-gold/60 text-[26px] font-light text-gold">
                  +
                </span>
                <span className="text-[13px] font-medium text-gold">Add</span>
              </a>
              {friends.map((friend) => (
                <FriendTile key={friend.id} person={friend} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[24px] border border-white/[0.06] bg-[#111113] p-3">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">
            Invite a friend
          </p>
          <CopyInviteLink username={user.username} />
        </section>
      </main>
    </div>
  );
}

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-1 text-[13px] font-medium text-white/40">
      {icon}
      {children}
    </div>
  );
}
