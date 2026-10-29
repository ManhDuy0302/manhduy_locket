"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { markNotificationsRead } from "@/app/actions/profile";

export function MarkNotificationsRead({ unread }: { unread: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!unread) {
      return;
    }

    let cancelled = false;

    markNotificationsRead().then(() => {
      if (!cancelled) {
        router.refresh();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [unread, router]);

  return null;
}
