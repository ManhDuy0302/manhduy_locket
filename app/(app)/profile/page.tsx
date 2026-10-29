import Link from "next/link";
import { ChevronRight, LogOut, Radio, UsersRound } from "lucide-react";

import { CopyInviteLink } from "@/components/CopyInviteLink";
import { PageHeader } from "@/components/PageHeader";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { EditNameRow } from "@/components/profile/ProfileRows";
import { signOutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { getFriendCount } from "@/lib/data";

export default async function ProfilePage() {
  const user = await requireUser();
    const friendCount = await getFriendCount(user.id);

  return (
    <div>
      <PageHeader title="Profile" backHref="/" />

      <main className="px-4 pb-8 pt-7">
        <div className="flex flex-col items-center">
          <AvatarUploader person={user} />
          <h2 className="mt-4 text-[23px] font-semibold tracking-[-0.02em]">
            {user.displayName}
          </h2>
          <p className="mt-0.5 text-[14px] text-white/40">@{user.username}</p>
          <Link
            href="/friends"
            className="mt-3 flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12.5px] font-medium text-white/55"
          >
            <UsersRound size={13} />
            {friendCount} {friendCount === 1 ? "friend" : "friends"}
          </Link>
        </div>

        <div className="mt-8 space-y-2">
          <EditNameRow name={user.displayName} />

          <Link
            href="/history"
            className="flex w-full items-center justify-between rounded-2xl bg-white/[0.045] px-4 py-3.5"
          >
            <span className="text-[15px] font-medium text-white/85">History</span>
            <ChevronRight size={18} className="text-white/35" />
          </Link>

          <Link
            href="/locket"
            className="flex w-full items-center justify-between rounded-2xl bg-white/[0.045] px-4 py-3.5"
          >
            <span className="flex items-center gap-2 text-[15px] font-medium text-white/85">
              <Radio size={16} className="text-gold" />
              Locket account
            </span>
            <ChevronRight size={18} className="text-white/35" />
          </Link>

          <CopyInviteLink username={user.username} />
        </div>

        <form action={signOutAction} className="mt-7">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.045] text-[15px] font-medium text-white/55 transition-colors active:bg-white/[0.08]"
          >
            <LogOut size={17} />
            Log out
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-white/20">
          Locket · Best friends first
        </p>
      </main>
    </div>
  );
}
