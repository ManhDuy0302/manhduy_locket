"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastItem = { id: number; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const activeTimers = timers.current;

    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const show = useCallback((message: string) => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { id, message }]);

    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);

    timers.current.push(timer);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+72px)]"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-up max-w-[430px] rounded-full border border-white/10 bg-[#2A2A2E]/95 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
