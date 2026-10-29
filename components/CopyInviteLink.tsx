"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

export function CopyInviteLink({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const link = `${window.location.origin}/u/${username}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy your Locket link", link);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-left transition-colors active:bg-white/[0.09]"
    >
      <span className="flex min-w-0 items-center gap-2.5 text-white/70">
        <Link2 size={17} className="shrink-0 text-gold" />
        <span className="truncate text-[14px]">/u/{username}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-gold">
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
