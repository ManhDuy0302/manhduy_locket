"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import {
  areFriends,
  getFriendCount,
  getUserByUsername,
  MAX_FRIENDS,
} from "@/lib/data";
import { getDb, nowIso } from "@/lib/db";
import type { ActionResult } from "@/lib/reactions";

function refreshApp(): void {
  revalidatePath("/", "layout");
}

async function acceptIncoming(fromId: string, toId: string): Promise<void> {
  const db = getDb();
  const stamp = nowIso();

  await db
    .prepare(
      `insert into friendships (user_id, friend_id, created_at) values (?, ?, ?)
       on conflict (user_id, friend_id) do nothing`,
    )
    .run(toId, fromId, stamp);
  await db
    .prepare(
      `insert into friendships (user_id, friend_id, created_at) values (?, ?, ?)
       on conflict (user_id, friend_id) do nothing`,
    )
    .run(fromId, toId, stamp);
  await db
    .prepare(
      "delete from friend_requests where (from_id = ? and to_id = ?) or (from_id = ? and to_id = ?)",
    )
    .run(fromId, toId, toId, fromId);
}

export async function sendFriendRequest(username: string): Promise<ActionResult> {
  const user = await requireUser();
  const target = await getUserByUsername(username.trim().toLowerCase());

  if (!target) {
    return { ok: false, error: "We couldn't find that username." };
  }

  if (target.id === user.id) {
    return { ok: false, error: "That's you." };
  }

  if (await areFriends(user.id, target.id)) {
    return { ok: false, error: "You're already friends." };
  }

  const db = getDb();
  const incoming = await db
    .prepare("select 1 as found from friend_requests where from_id = ? and to_id = ?")
    .get(target.id, user.id);

  if (incoming) {
    await acceptIncoming(target.id, user.id);
    refreshApp();
    return { ok: true, message: "You're friends now." };
  }

  if ((await getFriendCount(user.id)) >= MAX_FRIENDS) {
    return {
      ok: false,
      error: `Locket only allows ${MAX_FRIENDS} friends. Remove someone first.`,
    };
  }

  if ((await getFriendCount(target.id)) >= MAX_FRIENDS) {
    return { ok: false, error: "This person already has their 20 friends." };
  }

  await db
    .prepare(
      `insert into friend_requests (from_id, to_id, created_at) values (?, ?, ?)
       on conflict (from_id, to_id) do nothing`,
    )
    .run(user.id, target.id, nowIso());

  refreshApp();
  return { ok: true, message: "Friend request sent." };
}

export async function respondToRequest(
  fromId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const request = await db
    .prepare("select 1 as found from friend_requests where from_id = ? and to_id = ?")
    .get(fromId, user.id);

  if (!request) {
    return { ok: false, error: "That request is no longer available." };
  }

  if (accept) {
    if ((await getFriendCount(user.id)) >= MAX_FRIENDS) {
      return {
        ok: false,
        error: `Locket only allows ${MAX_FRIENDS} friends. Remove someone first.`,
      };
    }

    await acceptIncoming(fromId, user.id);
    refreshApp();
    return { ok: true, message: "Friend added." };
  }

  await db
    .prepare("delete from friend_requests where from_id = ? and to_id = ?")
    .run(fromId, user.id);
  refreshApp();
  return { ok: true };
}

export async function cancelFriendRequest(toId: string): Promise<ActionResult> {
  const user = await requireUser();

  await getDb()
    .prepare("delete from friend_requests where from_id = ? and to_id = ?")
    .run(user.id, toId);

  refreshApp();
  return { ok: true, message: "Request cancelled." };
}

export async function removeFriend(friendId: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();

  await db
    .prepare(
      "delete from friendships where (user_id = ? and friend_id = ?) or (user_id = ? and friend_id = ?)",
    )
    .run(user.id, friendId, friendId, user.id);
  await db
    .prepare(
      "delete from friend_requests where (from_id = ? and to_id = ?) or (from_id = ? and to_id = ?)",
    )
    .run(user.id, friendId, friendId, user.id);

  refreshApp();
  return { ok: true, message: "Friend removed." };
}
