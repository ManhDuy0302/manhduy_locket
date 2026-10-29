import { mediaUrl } from "@/lib/format";

type AvatarPerson = {
  displayName: string;
  username: string;
  avatarFile: string | null;
};

type AvatarProps = {
  person: AvatarPerson;
  size?: number;
  className?: string;
  priority?: boolean;
};

export function Avatar({ person, size = 40, className = "", priority = false }: AvatarProps) {
  const url = mediaUrl(person.avatarFile);
  const initial = (person.displayName || person.username || "?").trim().charAt(0).toUpperCase();

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={person.displayName}
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        draggable={false}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full bg-elevated object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B3B40] to-[#1D1D21] font-semibold text-white/80 ${className}`}
    >
      {initial}
    </div>
  );
}
