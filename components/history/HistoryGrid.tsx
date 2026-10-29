"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { clockTime, longDate } from "@/lib/format";

export type HistoryPhoto = {
  id: string;
  url: string;
  createdAt: string;
};

export type HistoryGroup = {
  label: string;
  photos: HistoryPhoto[];
};

export function HistoryGrid({ groups }: { groups: HistoryGroup[] }) {
  const flat = groups.flatMap((group) => group.photos);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIndex = activeId ? flat.findIndex((photo) => photo.id === activeId) : -1;
  const active = activeIndex >= 0 ? flat[activeIndex] : null;

  useEffect(() => {
    if (!active) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveId(null);
      }

      if (event.key === "ArrowLeft" && activeIndex > 0) {
        setActiveId(flat[activeIndex - 1].id);
      }

      if (event.key === "ArrowRight" && activeIndex < flat.length - 1) {
        setActiveId(flat[activeIndex + 1].id);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, activeIndex, flat]);

  return (
    <>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/30">
              {group.label}
            </h2>
            <div className="grid grid-cols-3 gap-1.5">
              {group.photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActiveId(photo.id)}
                  aria-label={`Open Locket from ${longDate(photo.createdAt)}`}
                  className="relative aspect-square overflow-hidden rounded-[14px] bg-elevated transition-transform active:scale-[0.97]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {active ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black">
          <div className="safe-top flex items-center justify-between px-4 py-3">
            <p className="text-[13px] font-medium text-white/60">
              {clockTime(active.createdAt)} · {longDate(active.createdAt)}
            </p>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="Close photo"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80"
            >
              <X size={19} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(env(safe-area-inset-bottom),16px)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt="Your Locket"
              className="max-h-full max-w-full rounded-[24px] object-contain"
            />

            {activeIndex > 0 ? (
              <button
                type="button"
                onClick={() => setActiveId(flat[activeIndex - 1].id)}
                aria-label="Previous photo"
                className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/80 backdrop-blur"
              >
                <ChevronLeft size={22} />
              </button>
            ) : null}

            {activeIndex < flat.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveId(flat[activeIndex + 1].id)}
                aria-label="Next photo"
                className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/80 backdrop-blur"
              >
                <ChevronRight size={22} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
