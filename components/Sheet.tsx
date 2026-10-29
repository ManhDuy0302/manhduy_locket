"use client";

import { useEffect } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-black/65 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fade-up relative w-full max-w-[460px] rounded-t-[28px] border-t border-white/10 bg-[#17171A] px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />
        {title ? (
          <h2 className="mb-4 text-center text-[17px] font-semibold">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}
