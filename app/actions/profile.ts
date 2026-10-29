"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import type { ActionResult } from "@/lib/reactions";

export async function markNotificationsRead(): Promise<void> {
  const user = await requireUser();

  getDb()
    .prepare("update users set notifications_read_at = ? where id = ?")
    .run(nowIso(), user.id);

  revalidatePath("/", "layout");
}

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const user = await requireUser();
  const trimmed = name.trim();

  if (trimmed.length < 1 || trimmed.length > 30) {
    return { ok: false, error: "Your name should be between 1 and 30 characters." };
  }

  getDb().prepare("update users set display_name = ? where id = ?").run(trimmed, user.id);
  revalidatePath("/", "layout");

  return { ok: true, message: "Name updated." };
}
