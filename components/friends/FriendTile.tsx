"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { removeFriend } from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import type { Person } from "@/lib/data";

export function FriendTile({ person }: { person: Person }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (pending) {
      return;
    }

    startTransition(async () => {
      const result = await removeFriend(person.id);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      setOpen(false);
      toast(result.message ?? "Friend removed.");
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-2 transition-transform active:scale-95"
      >
        <Avatar person={person} size={76} />
        <span className="max-w-[92px] truncate text-[13px] font-medium">
          {person.displayName}
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col items-center pt-1">
          <Avatar person={person} size={84} />
          <p className="mt-3 text-[18px] font-semibold">{person.displayName}</p>
          <p className="text-[13px] text-white/40">@{person.username}</p>

          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#26262A] text-[15px] font-semibold text-red-400 disabled:opacity-60"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            Remove friend
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1.5 h-11 w-full rounded-2xl text-[15px] font-medium text-white/55"
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </>
  );
}
