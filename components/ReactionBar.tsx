"use client";

import { useState, useTransition } from "react";
import { SmilePlus } from "lucide-react";

import { toggleReaction } from "@/app/actions/moments";
import { useToast } from "@/components/Toast";
import { ALL_REACTIONS, QUICK_REACTIONS } from "@/lib/reactions";

type ReactionBarProps = {
  momentId: string;
  initialEmoji: string | null;
  authorName: string;
};

export function ReactionBar({ momentId, initialEmoji, authorName }: ReactionBarProps) {
  const [emoji, setEmoji] = useState(initialEmoji);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const react = (value: string) => {
    if (pending) {
      return;
    }

    const previous = emoji;
    setEmoji(previous === value ? null : value);
    setPickerOpen(false);

    startTransition(async () => {
      const result = await toggleReaction(momentId, value);

      if (!result.ok) {
        setEmoji(previous);
        toast(result.error);
        return;
      }

      setEmoji(result.emoji);
    });
  };

  return (
    <div className="relative mt-3 flex justify-center">
      {pickerOpen ? (
        <>
          <button
            type="button"
            aria-label="Close reactions"
            onClick={() => setPickerOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="animate-pop absolute bottom-full z-20 mb-2 flex items-center gap-1 rounded-full border border-white/10 bg-[#202024]/95 p-1.5 shadow-2xl backdrop-blur">
            {ALL_REACTIONS.map((reaction) => (
              <button
                key={reaction}
                type="button"
                aria-label={`React with ${reaction}`}
                onClick={() => react(reaction)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[19px] leading-none transition-transform active:scale-90"
              >
                {reaction}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="glass flex items-center gap-1 rounded-full border border-white/[0.06] p-1.5">
        {QUICK_REACTIONS.map((reaction) => {
          const active = emoji === reaction;

          return (
            <button
              key={reaction}
              type="button"
              aria-label={`React with ${reaction}`}
              aria-pressed={active}
              onClick={() => react(reaction)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[19px] leading-none transition-all active:scale-90 ${
                active ? "bg-gold/20 ring-1 ring-gold/70" : "hover:bg-white/10"
              }`}
            >
              {reaction}
            </button>
          );
        })}
        <button
          type="button"
          aria-label={`More reactions for ${authorName}`}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            pickerOpen ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10"
          }`}
        >
          <SmilePlus size={19} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}
