export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="locket-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFDE7A" />
          <stop offset="100%" stopColor="#F0AE22" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill="url(#locket-gold)" />
      <path
        d="M32 47.5S16 38 16 28.6A7.6 7.6 0 0 1 32 25a7.6 7.6 0 0 1 16 3.6C48 38 32 47.5 32 47.5Z"
        fill="#fff"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[22px] font-semibold tracking-[-0.02em] ${className}`}>
      Locket
    </span>
  );
}
