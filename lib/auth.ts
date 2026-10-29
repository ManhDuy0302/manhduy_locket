import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb, nowIso } from "./db";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };

const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  username: string;
  displayName: string;
  avatarFile: string | null;
  notificationsReadAt: string | null;
  createdAt: string;
};

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  username: string;
  display_name: string;
  avatar_file: string | null;
  notifications_read_at: string | null;
  created_at: string;
};

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    username: row.username,
    displayName: row.display_name,
    avatarFile: row.avatar_file,
    notificationsReadAt: row.notifications_read_at,
    createdAt: row.created_at,
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");

  if (!salt || !expected) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");

  if (expectedBuffer.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(actual, expectedBuffer);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await getDb()
    .prepare(
      "insert into sessions (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)",
    )
    .run(hashToken(token), userId, nowIso(), expiresAt.toISOString());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Keeps the session working when the app is opened from a phone on the LAN
    // over plain http. Set COOKIE_SECURE=true behind https.
    secure: process.env.COOKIE_SECURE === "true",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await getDb().prepare("delete from sessions where token_hash = ?").run(hashToken(token));
  }

  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const row = (await getDb()
    .prepare(
      `select u.id, u.email, u.phone, u.username, u.display_name, u.avatar_file,
              u.notifications_read_at, u.created_at
       from sessions s
       join users u on u.id = s.user_id
       where s.token_hash = ? and s.expires_at > ?`,
    )
    .get(hashToken(token), nowIso())) as UserRow | undefined;

  return row ? toSessionUser(row) : null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
