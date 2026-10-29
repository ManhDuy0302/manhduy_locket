"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, X } from "lucide-react";

import { cancelFriendRequest } from "@/app/actions/friends";
import { useToast } from "@/components/Toast";

export function CancelRequestButton({ personId }: { personId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    if (pending) {
      return;
    }

    startTransition(async () => {
      const result = await cancelFriendRequest(personId);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      toast(result.message ?? "Request cancelled.");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={cancel}
      disabled={pending}
      aria-label="Cancel friend request"
      className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 text-[13px] font-medium text-white/55 disabled:opacity-60"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
      Requested
    </button>
  );
}
