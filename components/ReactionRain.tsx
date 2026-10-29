export function ReactionRain({ emojis }: { emojis: string[] }) {
  if (emojis.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[30px]"
    >
      {emojis.map((emoji, index) => (
        <span
          key={`${emoji}-${index}`}
          className="absolute animate-rain text-[22px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
          style={{
            left: `${6 + ((index * 37) % 86)}%`,
            top: "-10%",
            animationDelay: `${index * 180}ms`,
            animationDuration: `${2800 + (index % 4) * 380}ms`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
