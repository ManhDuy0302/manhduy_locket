import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { LogoMark } from "@/components/Logo";
import { AddFriendButton } from "@/components/friends/AddFriendButton";
import { CancelRequestButton } from "@/components/friends/CancelRequestButton";
import { RequestActions } from "@/components/friends/RequestActions";
import { getCurrentUser } from "@/lib/auth";
import {
  getFriendCount,
  getRelationships,
  getUserByUsername,
} from "@/lib/data";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const person = getUserByUsername(decodeURIComponent(username).replace(/^@/, ""));

  if (!person) {
    return (
      <main className="safe-top mx-auto flex min-h-dvh w-full max-w-[460px] flex-col items-center justify-center px-6 text-center">
        <LogoMark size={52} />
        <h1 className="mt-4 text-[20px] font-semibold">This Locket link is broken</h1>
        <p className="mt-2 text-[14px] text-white/40">
          We couldn&apos;t find @{decodeURIComponent(username)} on Locket.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-gold px-6 py-3 text-[14px] font-semibold text-black"
        >
          Open Locket
        </Link>
      </main>
    );
  }

  const viewer = await getCurrentUser();
  const friendCount = getFriendCount(person.id);
  const isSelf = viewer?.id === person.id;
  const relationships = viewer ? getRelationships(viewer.id) : null;
  const isFriend = relationships?.friends.has(person.id) ?? false;
  const incoming = relationships?.incoming.has(person.id) ?? false;
  const outgoing = relationships?.outgoing.has(person.id) ?? false;

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-6">
      <div className="flex h-14 items-center justify-between">
        <Link
          href={viewer ? "/" : "/login"}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70"
        >
          <ChevronLeft size={24} />
        </Link>
        <LogoMark size={28} />
        <span className="h-9 w-9" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
        <Avatar person={person} size={112} />
        <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em]">
          {person.displayName}
        </h1>
        <p className="mt-1 text-[14px] text-white/40">@{person.username}</p>
        <p className="mt-3 flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12.5px] text-white/50">
          <Heart size={12} className="text-gold" fill="currentColor" strokeWidth={0} />
          {friendCount} {friendCount === 1 ? "friend" : "friends"} on Locket
        </p>

        <div className="mt-9 flex w-full flex-col items-center gap-3">
          {!viewer ? (
            <>
              <Link
                href={`/login?next=/u/${encodeURIComponent(person.username)}`}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-gold text-[15px] font-semibold text-black"
              >
                Log in to add {person.displayName.split(" ")[0]}
              </Link>
              <Link
                href={`/signup?next=/u/${encodeURIComponent(person.username)}`}
                className="text-[13px] font-medium text-white/45"
              >
                New to Locket? Create an account
              </Link>
            </>
          ) : isSelf ? (
            <>
              <p className="text-[14px] text-white/45">This is your Locket link.</p>
              <Link
                href="/profile"
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/[0.07] text-[15px] font-semibold text-white/80"
              >
                Open your profile
              </Link>
            </>
          ) : isFriend ? (
            <span className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-[15px] font-semibold text-white/55">
              You&apos;re friends
            </span>
          ) : incoming ? (
            <>
              <p className="text-[13px] text-white/45">
                {person.displayName.split(" ")[0]} wants to be your friend.
              </p>
              <RequestActions fromId={person.id} withLabels />
            </>
          ) : outgoing ? (
            <CancelRequestButton personId={person.id} />
          ) : (
            <AddFriendButton username={person.username} />
          )}
        </div>
      </div>
    </main>
  );
}
