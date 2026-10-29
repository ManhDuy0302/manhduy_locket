export const QUICK_REACTIONS = ["🔥", "💖"] as const;

export const ALL_REACTIONS = ["🔥", "💖", "😂", "😮", "😢", "👏", "✨", "🥰"] as const;

export function isAllowedReaction(value: string): boolean {
  return (ALL_REACTIONS as readonly string[]).includes(value);
}

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export type ReactionResult =
  | { ok: true; emoji: string | null }
  | { ok: false; error: string };

export type AuthState = { error: string | null };
