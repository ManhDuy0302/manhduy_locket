"use server";

import { requireUser } from "@/lib/auth";
import { areFriends } from "@/lib/data";
import { getDb, nowIso } from "@/lib/db";
import { isAllowedReaction, type ReactionResult } from "@/lib/reactions";

export async function toggleReaction(
  momentId: string,
  emoji: string,
): Promise<ReactionResult> {
  if (!isAllowedReaction(emoji)) {
    return { ok: false, error: "That reaction isn't available." };
  }

  const user = await requireUser();
  const db = getDb();

  const moment = db
    .prepare("select user_id from moments where id = ?")
    .get(momentId) as { user_id: string } | undefined;

  if (!moment) {
    return { ok: false, error: "This Locket is no longer available." };
  }

  if (moment.user_id === user.id) {
    return { ok: false, error: "You can't react to your own Locket." };
  }

  if (!areFriends(user.id, moment.user_id)) {
    return { ok: false, error: "You need to be friends to react." };
  }

  const existing = db
    .prepare(
      "select emoji from moment_reactions where moment_id = ? and user_id = ?",
    )
    .get(momentId, user.id) as { emoji: string } | undefined;

  if (existing?.emoji === emoji) {
    db.prepare(
      "delete from moment_reactions where moment_id = ? and user_id = ?",
    ).run(momentId, user.id);
    return { ok: true, emoji: null };
  }

  db.prepare(
    `insert into moment_reactions (moment_id, user_id, emoji, created_at)
     values (?, ?, ?, ?)
     on conflict (moment_id, user_id) do update
     set emoji = excluded.emoji, created_at = excluded.created_at`,
  ).run(momentId, user.id, emoji, nowIso());

  return { ok: true, emoji };
}
