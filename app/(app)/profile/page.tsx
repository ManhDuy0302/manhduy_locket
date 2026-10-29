import Link from "next/link";
import { ChevronRight, LogOut, Radio } from "lucide-react";

import { CopyInviteLink } from "@/components/CopyInviteLink";
import { PageHeader } from "@/components/PageHeader";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { EditNameRow } from "@/components/profile/ProfileRows";
import { signOutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { getLocketAccount } from "@/lib/locket/store";

export default async function ProfilePage() {
  const user = await requireUser();
  const account = await getLocketAccount(user.id);
  const displayName = account?.displayName ?? user.displayName;
  const handle = account?.username ?? user.username;

  return (
    <div>
      <PageHeader title="Profile" backHref="/" />

      <main className="px-4 pb-8 pt-7">
        <div className="flex flex-col items-center">
          {account?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.avatarUrl}
              alt={displayName}
              width={92}
              height={92}
              className="h-[92px] w-[92px] rounded-full bg-elevated object-cover"
            />
          ) : (
            <AvatarUploader person={user} />
          )}

          <h2 className="mt-4 text-[23px] font-semibold tracking-[-0.02em]">{displayName}</h2>
          <p className="mt-0.5 text-[14px] text-white/40">@{handle}</p>

          {account ? (
            <span className="mt-3 flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 text-[12.5px] font-medium text-gold">
              <Radio size={13} />
              Connected to Locket
            </span>
          ) : null}
        </div>

        <div className="mt-8 space-y-2">
          {!account ? <EditNameRow name={user.displayName} /> : null}

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

          {!account ? <CopyInviteLink username={user.username} /> : null}
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
