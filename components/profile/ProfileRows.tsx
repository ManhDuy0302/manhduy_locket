"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";

import { updateDisplayName } from "@/app/actions/profile";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";

export function EditNameRow({ name }: { name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (pending) {
      return;
    }

    startTransition(async () => {
      const result = await updateDisplayName(value);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      setOpen(false);
      toast(result.message ?? "Name updated.");
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setOpen(true);
        }}
        className="flex w-full items-center justify-between rounded-2xl bg-white/[0.045] px-4 py-3.5 text-left"
      >
        <span className="text-[15px] font-medium text-white/85">Name</span>
        <span className="flex items-center gap-2 text-[14px] text-white/40">
          {name}
          <Pencil size={14} />
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Edit name">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={30}
          autoFocus
          className="h-12 w-full rounded-2xl border border-white/10 bg-elevated px-4 text-[15px] outline-none focus:border-gold/60"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || value.trim().length === 0}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-1.5 h-11 w-full rounded-2xl text-[15px] font-medium text-white/55"
        >
          Cancel
        </button>
      </Sheet>
    </>
  );
}
