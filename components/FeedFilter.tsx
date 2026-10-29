"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "mine", label: "Just me" },
] as const;

export function FeedFilter({ scope }: { scope: "everyone" | "mine" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeLabel = OPTIONS.find((option) => option.value === scope)?.label ?? "Everyone";

  const select = (value: "everyone" | "mine") => {
    setOpen(false);
    router.push(value === "mine" ? "/?scope=mine" : "/", { scroll: false });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass flex items-center gap-1.5 rounded-full border border-white/[0.06] px-4 py-[7px] text-[15px] font-medium"
      >
        {activeLabel}
        <ChevronDown
          size={15}
          strokeWidth={2.4}
          className={`text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="animate-pop absolute left-1/2 top-full z-50 mt-2 w-[168px] -translate-x-1/2 rounded-[20px] border border-white/10 bg-[#202024]/97 p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          {OPTIONS.map((option) => {
            const selected = option.value === scope;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => select(option.value)}
                className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                  selected ? "text-white" : "text-white/60 hover:bg-white/[0.06]"
                }`}
              >
                {option.label}
                {selected ? <Check size={16} className="text-gold" strokeWidth={2.5} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
