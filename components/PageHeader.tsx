import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
};

export function PageHeader({ title, backHref, right }: PageHeaderProps) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-white/[0.05] bg-black/70 backdrop-blur-2xl">
      <div className="relative flex h-[56px] items-center justify-center px-14">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="absolute left-3 flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors active:bg-white/10"
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </Link>
        ) : null}
        <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em]">{title}</h1>
        {right ? <div className="absolute right-3 flex items-center">{right}</div> : null}
      </div>
    </header>
  );
}
