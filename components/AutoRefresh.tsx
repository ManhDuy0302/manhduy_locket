"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const timer = window.setInterval(refresh, intervalMs);

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
