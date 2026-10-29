"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UsersRound } from "lucide-react";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/friends", label: "Friends", Icon: UsersRound },
];

/** Mirror of the Locket tab bar: home, shutter, friends. */
export function BottomNav() {
  const pathname = usePathname();

  const renderItem = ({ href, label, Icon }: (typeof items)[number]) => {
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
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),14px)]">
      <nav
        aria-label="Locket"
        className="glass pointer-events-auto flex items-center gap-1 rounded-full border border-white/[0.07] p-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.6)]"
      >
        {renderItem(items[0])}

        <Link
          href="/camera"
          aria-label="Open camera"
          className="mx-1.5 flex h-[54px] w-[54px] items-center justify-center rounded-full border-[3px] border-gold bg-black transition-transform active:scale-95"
        >
          <span className="h-[38px] w-[38px] rounded-full bg-white" />
        </Link>

        {renderItem(items[1])}
      </nav>
    </div>
  );
}
