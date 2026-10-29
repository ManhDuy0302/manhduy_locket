"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { isLocketAdmin } from "@/lib/locket/admin";
import { fetchLocketProfile, reactToLocketMoment } from "@/lib/locket/api";
import {
  getLocketSession,
  locketErrorMessage,
  refreshLocketIdToken,
  signInToLocket,
  LocketError,
  type LocketSession,
} from "@/lib/locket/client";
import { getLocketConfig, saveLocketConfigInput } from "@/lib/locket/config";
import { clearLocketCaches } from "@/lib/locket/feed";
import { deleteLocketAccount, saveLocketAccount } from "@/lib/locket/store";
import type { ActionResult } from "@/lib/reactions";

function provisionalSession(
  userId: string,
  tokens: { uid: string; idToken: string; refreshToken: string },
): LocketSession {
  return {
    userId,
    uid: tokens.uid,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Signs in against Locket's own Firebase project (verifyPassword) and stores
 * the refresh token so the app can read the real feed later on.
 */
export async function connectLocketAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return {
      ok: false,
      error: "Enter the email or phone number and the password of your Locket account.",
    };
  }

  // Firebase's password endpoint only understands email addresses.
  if (identifier.startsWith("+") || /^\d[\d\s-]*$/.test(identifier)) {
    return {
      ok: false,
      error:
        "Password login only accepts the account email. Use the Locket email, or connect with a captured session below.",
    };
  }

  if (!getLocketConfig().apiKey) {
    return { ok: false, error: "Save Locket's Firebase API key under Server setup first." };
  }

  try {
    const tokens = await signInToLocket(identifier, password);
    let profile = null;

    try {
      profile = await fetchLocketProfile(
        provisionalSession(user.id, tokens),
        tokens.uid,
      );
    } catch {
      // The account is usable even if the profile lookup is rate limited.
    }

    const isPhone = identifier.startsWith("+");
    const profileName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim() || profile.username
      : null;

    saveLocketAccount({
      userId: user.id,
      uid: tokens.uid,
      email: isPhone ? null : identifier,
      phone: isPhone ? identifier : null,
      displayName: profileName,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      idToken: tokens.idToken,
      idTokenExpiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    });

    revalidatePath("/", "layout");
    clearLocketCaches(user.id);

    return {
      ok: true,
      message: profile?.username
        ? `Connected as @${profile.username}`
        : "Connected to your Locket account.",
    };
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}

/*
 * Locket's own iOS app signs in with a custom token from its backend (see
 * verifyCustomToken), so many accounts never get a password. Operators can
 * paste a refresh_token captured from the app instead.
 */
export async function connectLocketWithTokenAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const refreshToken = String(formData.get("refreshToken") ?? "").trim();

  if (!refreshToken) {
    return { ok: false, error: "Paste the refresh_token captured from the Locket app." };
  }

  if (!getLocketConfig().apiKey) {
    return { ok: false, error: "Save Locket's Firebase API key under Server setup first." };
  }

  try {
    const tokens = await refreshLocketIdToken(refreshToken);

    if (!tokens.uid) {
      throw new LocketError(
        "That token didn't return a Locket user id. Capture a fresh refresh_token.",
      );
    }

    let profile = null;

    try {
      profile = await fetchLocketProfile(provisionalSession(user.id, tokens), tokens.uid);
    } catch {
      // A missing profile only costs the display name.
    }

    const profileName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim() || profile.username
      : null;

    saveLocketAccount({
      userId: user.id,
      uid: tokens.uid,
      email: null,
      phone: null,
      displayName: profileName,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      idToken: tokens.idToken,
      idTokenExpiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    });

    clearLocketCaches(user.id);
    revalidatePath("/", "layout");

    return {
      ok: true,
      message: profile?.username
        ? `Connected as @${profile.username}`
        : "Connected to your Locket session.",
    };
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}

export async function disconnectLocketAction(): Promise<ActionResult> {
  const user = await requireUser();

  deleteLocketAccount(user.id);
  clearLocketCaches(user.id);
  revalidatePath("/", "layout");

  return { ok: true, message: "Locket account disconnected." };
}

export async function saveLocketConfigAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  if (!isLocketAdmin(user)) {
    return { ok: false, error: "Only the site owner can change these settings." };
  }

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const appCheckToken = String(formData.get("appCheckToken") ?? "").trim();
  const instanceIdToken = String(formData.get("instanceIdToken") ?? "").trim();
  const apiBase = String(formData.get("apiBase") ?? "").trim();

  if (!apiKey && !appCheckToken && !instanceIdToken && !apiBase) {
    return { ok: false, error: "Fill at least one field before saving." };
  }

  saveLocketConfigInput({
    ...(apiKey ? { apiKey } : {}),
    ...(appCheckToken ? { appCheckToken } : {}),
    ...(instanceIdToken ? { instanceIdToken } : {}),
    ...(apiBase ? { apiBase } : {}),
  });

  clearLocketCaches();
  revalidatePath("/", "layout");

  return { ok: true, message: "Locket server settings saved." };
}

/** Hits `fetchUserV2`, which is enough to prove token + App Check work. */
export async function testLocketConnectionAction(): Promise<ActionResult> {
  const user = await requireUser();

  try {
    const session = await getLocketSession(user.id);
    const profile = await fetchLocketProfile(session, session.uid);

    return {
      ok: true,
      message: profile?.username
        ? `Locket answered for @${profile.username}.`
        : "Locket answered for your account.",
    };
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}

export async function reactToLocketMomentAction(
  momentId: string,
  ownerUid: string,
  emoji: string,
): Promise<ActionResult> {
  const user = await requireUser();

  if (!momentId || !ownerUid) {
    return { ok: false, error: "That Locket is no longer available." };
  }

  try {
    const session = await getLocketSession(user.id);

    await reactToLocketMoment(session, { momentId, ownerUid, emoji });
    revalidatePath("/");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: locketErrorMessage(error) };
  }
}
