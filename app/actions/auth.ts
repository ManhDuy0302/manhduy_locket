"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import type { AuthState } from "@/lib/reactions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNext(formData: FormData): string | null {
  const value = formData.get("next");

  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export async function signInAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const db = getDb();
  const row = (await db
    .prepare("select id, password_hash from users where lower(email) = lower(?)")
    .get(email)) as { id: string; password_hash: string | null } | undefined;

  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    return { error: "Wrong email or password." };
  }

  await db.prepare("delete from sessions where expires_at <= ?").run(nowIso());
  await createSession(row.id);

  redirect(readNext(formData) ?? "/");
}

export async function signUpAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const displayName = readString(formData, "displayName");
  const username = readString(formData, "username").toLowerCase();
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (displayName.length < 1 || displayName.length > 30) {
    return { error: "Your name should be between 1 and 30 characters." };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Usernames use 3–20 letters, numbers, dots or underscores.",
    };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const db = getDb();
  const existingEmail = await db
    .prepare("select 1 as found from users where lower(email) = lower(?)")
    .get(email);
  const existingUsername = await db
    .prepare("select 1 as found from users where lower(username) = lower(?)")
    .get(username);

  if (existingEmail) {
    return { error: "An account with this email already exists." };
  }

  if (existingUsername) {
    return { error: "That username is taken. Try another one." };
  }

  const id = randomUUID();

  await db
    .prepare(
      `insert into users (id, email, username, display_name, password_hash, created_at)
       values (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, email, username, displayName, hashPassword(password), nowIso());

  await createSession(id);
  redirect(readNext(formData) ?? "/friends");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
