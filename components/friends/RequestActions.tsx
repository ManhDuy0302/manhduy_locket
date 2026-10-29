"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";

import { respondToRequest } from "@/app/actions/friends";
import { useToast } from "@/components/Toast";

type RequestActionsProps = {
  fromId: string;
  withLabels?: boolean;
};

export function RequestActions({ fromId, withLabels = false }: RequestActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const respond = (accept: boolean) => {
    if (pending) {
      return;
    }

    startTransition(async () => {
      const result = await respondToRequest(fromId, accept);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      toast(result.message ?? (accept ? "Friend added." : "Request declined."));
      router.refresh();
    });
  };

  if (withLabels) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={pending}
          className="h-9 rounded-full bg-white/[0.07] px-4 text-[13px] font-semibold text-white/70 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => respond(true)}
          disabled={pending}
          className="flex h-9 items-center gap-1.5 rounded-full bg-gold px-4 text-[13px] font-semibold text-black disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          Accept
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => respond(false)}
        disabled={pending}
        aria-label="Decline request"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-white/55 disabled:opacity-50"
      >
        <X size={17} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={() => respond(true)}
        disabled={pending}
        aria-label="Accept request"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-black disabled:opacity-50"
      >
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Check size={18} strokeWidth={3} />
        )}
      </button>
    </div>
  );
}
