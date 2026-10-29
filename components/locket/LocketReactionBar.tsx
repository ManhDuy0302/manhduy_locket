"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { reactToLocketMomentAction } from "@/app/actions/locket";
import { useToast } from "@/components/Toast";

const REACTIONS = ["🔥", "💖", "😂"];

type LocketReactionBarProps = {
  momentId: string;
  ownerUid: string;
};

export function LocketReactionBar({ momentId, ownerUid }: LocketReactionBarProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState<string | null>(null);

  const react = (emoji: string) => {
    if (pending) {
      return;
    }

    const previous = sent;
    setSent(emoji);

    startTransition(async () => {
      const result = await reactToLocketMomentAction(momentId, ownerUid, emoji);

      if (!result.ok) {
        setSent(previous);
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="mt-2.5 flex items-center justify-center gap-1.5">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => react(emoji)}
          disabled={pending}
          aria-label={`React with ${emoji}`}
          className={`flex h-9 w-11 items-center justify-center rounded-full border text-[16px] transition-transform active:scale-95 ${
            sent === emoji
              ? "border-gold/50 bg-gold/15"
              : "border-white/[0.07] bg-white/[0.045]"
          } disabled:opacity-60`}
        >
          {pending && sent === emoji ? (
            <Loader2 size={14} className="animate-spin text-white/60" />
          ) : (
            emoji
          )}
        </button>
      ))}
    </div>
  );
}
