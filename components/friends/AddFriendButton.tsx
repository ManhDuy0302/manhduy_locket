"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import { sendFriendRequest } from "@/app/actions/friends";
import { useToast } from "@/components/Toast";

export function AddFriendButton({ username }: { username: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const add = () => {
    if (pending) {
      return;
    }

    startTransition(async () => {
      const result = await sendFriendRequest(username);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      toast(result.message ?? "Friend request sent.");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={add}
      disabled={pending}
      className="flex h-9 items-center gap-1.5 rounded-full bg-gold px-4 text-[13px] font-semibold text-black transition-transform active:scale-95 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Plus size={15} strokeWidth={2.6} />
      )}
      Add
    </button>
  );
}
