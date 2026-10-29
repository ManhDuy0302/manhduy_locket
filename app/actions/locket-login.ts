"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createSession } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import type { ActionResult } from "@/lib/reactions";
import { fetchLocketProfile } from "@/lib/locket/api";
import {
  locketErrorMessage,
  refreshLocketIdToken,
  requestLocketPasswordReset,
  signInToLocket,
  type LocketSession,
} from "@/lib/locket/client";
import { getLocketConfig } from "@/lib/locket/config";
import { clearLocketCaches } from "@/lib/locket/feed";
import { saveLocketAccount } from "@/lib/locket/store";

const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

type LocketTokens = {
  uid: string;
  idToken: string;
  refreshToken: string;
  expiresAt: string;
};

/** Accepts either an email address or a phone number in E.164 form. */
function cleanIdentifier(raw: string): string | null {
  const value = raw.trim();

  if (!value) {
    return null;
  }

  if (value.includes("@")) {
    return value.toLowerCase();
  }

  const digits = value.replace(/[\s\-()]/g, "");

  // Firebase wants E.164, so a local "0901..." number can't be used as is.
  if (!/^\+?\d{7,15}$/.test(digits) || digits.startsWith("0")) {
    return null;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

function toHandle(candidate: string | undefined): string {
  const cleaned = (candidate ?? "").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 20);

  return USERNAME_PATTERN.test(cleaned) ? cleaned : "";
}

async function uniqueUsername(candidates: (string | undefined)[], uid: string): Promise<string> {
  const db = getDb();
  const fallback = `locket${uid.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase()}`;
  const seed = candidates.map(toHandle).find(Boolean) ?? fallback;
  let candidate = seed;
  let suffix = 1;

  while (
    await db.prepare("select 1 as found from users where lower(username) = lower(?)").get(candidate)
  ) {
    suffix += 1;
    const tail = String(suffix);
    candidate = `${seed.slice(0, Math.max(1, 20 - tail.length))}${tail}`;
  }

  return candidate;
}

/** Reads the e-mail / phone baked into a Firebase ID token (no verification). */
function claimsFromIdToken(idToken: string): { email: string | null; phone: string | null } {
  try {
    const payload = idToken.split(".")[1];

    if (!payload) {
      return { email: null, phone: null };
    }

    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      phone_number?: string;
    };

    return { email: json.email ?? null, phone: json.phone_number ?? null };
  } catch {
    return { email: null, phone: null };
  }
}

/**
 * Reuses the local account already linked to that Locket UID (or creates one),
 * stores the fresh tokens and opens a session. Both login paths end up here.
 */
async function linkAndOpenSession(
  tokens: LocketTokens,
  identifier: { email: string | null; phone: string | null },
): Promise<ActionResult> {
  const provisional: LocketSession = {
    userId: "pending",
    uid: tokens.uid,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
  };

  let profile = null;

  try {
    profile = await fetchLocketProfile(provisional, tokens.uid);
  } catch {
    // The login still succeeds without the profile lookup.
  }

  const db = getDb();
  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim() || profile.username
    : "";
  const handle = profile?.username ?? "";

  const linked = (await db
    .prepare("select user_id from locket_accounts where locket_uid = ?")
    .get(tokens.uid)) as { user_id: string } | undefined;

  let userId = linked?.user_id ?? null;

  if (!userId && identifier.email) {
    const existing = (await db
      .prepare("select id from users where lower(email) = lower(?)")
      .get(identifier.email)) as { id: string } | undefined;

    userId = existing?.id ?? null;
  }

  if (!userId && identifier.phone) {
    const existing = (await db
      .prepare("select id from users where phone = ?")
      .get(identifier.phone)) as { id: string } | undefined;

    userId = existing?.id ?? null;
  }

  if (!userId) {
    const createdId = randomUUID();
    const username = await uniqueUsername(
      [handle, identifier.email?.split("@")[0], identifier.phone ?? undefined, displayName],
      tokens.uid,
    );

    await db
      .prepare(
        `insert into users (id, email, phone, username, display_name, created_at)
         values (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        createdId,
        identifier.email,
        identifier.phone,
        username,
        displayName || username,
        nowIso(),
      );

    userId = createdId;
  }

  await saveLocketAccount({
    userId,
    uid: tokens.uid,
    email: identifier.email,
    phone: identifier.phone,
    displayName: displayName || handle || null,
    username: handle || null,
    avatarUrl: profile?.avatarUrl ?? null,
    idToken: tokens.idToken,
    idTokenExpiresAt: tokens.expiresAt,
    refreshToken: tokens.refreshToken,
  });

  await createSession(userId);
  clearLocketCaches(userId);
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: handle ? `Welcome back, @${handle}` : "Welcome to Locket.",
  };
}

/**
 * The "just log in" path: signs in against Locket with the account email and
 * password, then opens a local session automatically.
 */
export async function locketSignInAction(formData: FormData): Promise<ActionResult> {
  const identifier = cleanIdentifier(String(formData.get("identifier") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return {
      ok: false,
      error: "Enter the email or +84 phone number and the password of your Locket account.",
    };
  }

  // Firebase's password endpoint only understands e-mail addresses.
  if (!identifier.includes("@")) {
    return {
      ok: false,
      error:
        "Locket's password login needs the email on the account, not the phone number. Use \"Forgot password\" to set one, or the Session code tab.",
    };
  }

  if (!getLocketConfig().apiKey) {
    return { ok: false, error: "This server isn't connected to Locket yet. Ask the site owner." };
  }

  try {
    const tokens = await signInToLocket(identifier, password);
    const isEmail = identifier.includes("@");

    return await linkAndOpenSession(tokens, {
      email: isEmail ? identifier : null,
      phone: isEmail ? null : identifier,
    });
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}

/**
 * Sends Locket's own password reset email, so people who only ever signed in
 * with a phone number can set a password and use the email login.
 */
export async function locketForgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("identifier") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return {
      ok: false,
      error: "Type the email attached to your Locket account, then press Forgot password.",
    };
  }

  if (!getLocketConfig().apiKey) {
    return { ok: false, error: "This server isn't connected to Locket yet. Ask the site owner." };
  }

  try {
    await requestLocketPasswordReset(email);

    return {
      ok: true,
      message: `Locket sent a reset link to ${email}. Open it, set a password, then log in here with that email.`,
    };
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}

/**
 * Locket accounts created with a phone number have no password (the iOS app
 * logs in with a one-time code from Locket's own backend). For those, the
 * session captured from the app is exchanged for a normal web session.
 */
export async function locketTokenSignInAction(formData: FormData): Promise<ActionResult> {
  const refreshToken = String(formData.get("refreshToken") ?? "").trim();

  if (!refreshToken) {
    return { ok: false, error: "Paste the refresh_token captured from the Locket app." };
  }

  if (!getLocketConfig().apiKey) {
    return { ok: false, error: "This server isn't connected to Locket yet. Ask the site owner." };
  }

  try {
    const tokens = await refreshLocketIdToken(refreshToken);

    if (!tokens.uid) {
      return { ok: false, error: "That code didn't return a Locket user. Capture a fresh one." };
    }

    return await linkAndOpenSession(tokens, claimsFromIdToken(tokens.idToken));
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}
