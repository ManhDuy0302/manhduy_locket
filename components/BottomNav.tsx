"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, UsersRound } from "lucide-react";

type BottomNavProps = {
  badge: number;
};

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/friends", label: "Friends", Icon: UsersRound },
];

export function BottomNav({ badge }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),14px)]">
      <nav
        aria-label="Locket"
        className="glass pointer-events-auto flex items-center gap-1 rounded-full border border-white/[0.07] p-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.6)]"
      >
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex h-12 w-14 items-center justify-center rounded-full transition-colors ${
                active ? "bg-white/[0.13] text-white" : "text-white/45 active:bg-white/[0.08]"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.3 : 2} />
            </Link>
          );
        })}

        <Link
          href="/camera"
          aria-label="Open camera"
          className="mx-1.5 flex h-[54px] w-[54px] items-center justify-center rounded-full border-[3px] border-gold bg-black transition-transform active:scale-95"
        >
          <span className="h-[38px] w-[38px] rounded-full bg-white" />
        </Link>

        <Link
          href="/notifications"
          aria-label="Notifications"
          aria-current={pathname === "/notifications" ? "page" : undefined}
          className={`relative flex h-12 w-14 items-center justify-center rounded-full transition-colors ${
            pathname === "/notifications"
              ? "bg-white/[0.13] text-white"
              : "text-white/45 active:bg-white/[0.08]"
          }`}
        >
          <MessageCircle size={22} strokeWidth={2} />
          {badge > 0 ? (
            <span className="absolute right-2.5 top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-black">
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </Link>
      </nav>
    </div>
  );
}
