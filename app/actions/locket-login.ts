"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createSession } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import type { ActionResult } from "@/lib/reactions";
import { fetchLocketProfile } from "@/lib/locket/api";
import { locketErrorMessage, signInToLocket, type LocketSession } from "@/lib/locket/client";
import { getLocketConfig } from "@/lib/locket/config";
import { clearLocketCaches } from "@/lib/locket/feed";
import { saveLocketAccount } from "@/lib/locket/store";

const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

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

function uniqueUsername(candidates: (string | undefined)[], uid: string): string {
  const db = getDb();
  const fallback = `locket${uid.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase()}`;
  const seed = candidates.map(toHandle).find(Boolean) ?? fallback;
  let candidate = seed;
  let suffix = 1;

  while (db.prepare("select 1 as found from users where username = ?").get(candidate)) {
    suffix += 1;
    const tail = String(suffix);
    candidate = `${seed.slice(0, 20 - tail.length)}${tail}`;
  }

  return candidate;
}

/**
 * The "just log in" path: signs in against Locket, then reuses the local account
 * already linked to that Locket UID or creates one on the fly, and finally
 * opens a session for it.
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

  if (!getLocketConfig().apiKey) {
    return { ok: false, error: "This server isn't connected to Locket yet. Ask the site owner." };
  }

  try {
    const tokens = await signInToLocket(identifier, password);
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
    const isEmail = identifier.includes("@");
    const email = isEmail ? identifier : null;
    const phone = isEmail ? null : identifier;
    const displayName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim() || profile.username
      : "";
    const handle = profile?.username ?? "";

    const linked = (await db
      .prepare("select user_id from locket_accounts where locket_uid = ?")
      .get(tokens.uid)) as { user_id: string } | undefined;

    let userId = linked?.user_id ?? null;

    if (!userId) {
      const existing = (isEmail
        ? await db.prepare("select id from users where lower(email) = lower(?)").get(email)
        : await db.prepare("select id from users where phone = ?").get(phone)) as
        | { id: string }
        | undefined;

      userId = existing?.id ?? null;
    }

    if (!userId) {
      const createdId = randomUUID();
      const username = uniqueUsername(
        [handle, isEmail ? identifier.split("@")[0] : "", displayName],
        tokens.uid,
      );

      await db
        .prepare(
          `insert into users (id, email, phone, username, display_name, created_at)
           values (?, ?, ?, ?, ?, ?)`,
        )
        .run(createdId, email, phone, username, displayName || username, nowIso());

      userId = createdId;
    }

    await saveLocketAccount({
      userId,
      uid: tokens.uid,
      email,
      phone,
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
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}
