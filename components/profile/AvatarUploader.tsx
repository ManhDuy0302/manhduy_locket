"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { preparePhoto } from "@/lib/image-client";

type AvatarUploaderProps = {
  person: {
    displayName: string;
    username: string;
    avatarFile: string | null;
  };
};

export function AvatarUploader({ person }: AvatarUploaderProps) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file || uploading) {
      return;
    }

    setUploading(true);

    try {
      const blob = await preparePhoto(file);
      const formData = new FormData();
      formData.append("photo", blob, "avatar.jpg");

      const response = await fetch("/api/avatar", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        toast(payload?.error ?? "Couldn't update your photo.");
        return;
      }

      toast("Profile photo updated.");
      router.refresh();
    } catch {
      toast("We couldn't read that photo. Try another one.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile photo"
        className="relative block rounded-full transition-transform active:scale-[0.98]"
      >
        <Avatar person={person} size={104} />
        <span className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-black bg-gold text-black">
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Camera size={14} strokeWidth={2.4} />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
