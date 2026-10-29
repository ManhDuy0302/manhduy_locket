import { randomBytes, randomUUID, scryptSync } from "node:crypto";

import { getDb, nowIso } from "./db";
import { fetchLocketProfile } from "./locket/api";
import { refreshLocketIdToken, type LocketSession } from "./locket/client";
import { ensureConfigLoaded, getLocketConfig } from "./locket/config";
import { getLocketAccount, saveLocketAccount } from "./locket/store";

/**
 * First-boot helper for a fresh deployment (Vercel, Railway, VPS...).
 *
 * On an empty database it creates the owner account from env vars and, when a
 * captured refresh token is supplied, links the real Locket account straight
 * away. Running it again is a no-op because every step is guarded by a check.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export async function runBootstrap(): Promise<void> {
  if (process.env.BOOTSTRAP_DISABLED === "true") {
    return;
  }

  try {
    await ensureConfigLoaded();

    const db = getDb();
    const ownerRow = (await db
      .prepare("select count(*)::int as total from users")
      .get()) as { total: number } | undefined;

    if ((ownerRow?.total ?? 0) === 0) {
      const email = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
      const password = process.env.BOOTSTRAP_OWNER_PASSWORD;

      if (email && password) {
        const username =
          (process.env.BOOTSTRAP_OWNER_USERNAME ?? "owner")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9._]/g, "")
            .slice(0, 20) || "owner";
        const displayName = process.env.BOOTSTRAP_OWNER_NAME?.trim() || "Owner";

        await db
          .prepare(
            `insert into users (id, email, phone, username, display_name, password_hash, created_at)
             values (?, ?, null, ?, ?, ?, ?)`,
          )
          .run(randomUUID(), email, username, displayName, hashPassword(password), nowIso());

        console.log(`[bootstrap] owner account created: ${email}`);
      }
    }

    const refreshToken = process.env.BOOTSTRAP_LOCKET_REFRESH_TOKEN?.trim();

    if (!refreshToken) {
      return;
    }

    const first = (await db
      .prepare("select id from users order by created_at asc, id asc limit 1")
      .get()) as { id: string } | undefined;

    if (!first) {
      return;
    }

    if (await getLocketAccount(first.id)) {
      return;
    }

    if (!getLocketConfig().apiKey) {
      console.warn("[bootstrap] Locket API key missing, skipping account link");
      return;
    }

    const tokens = await refreshLocketIdToken(refreshToken);

    if (!tokens.uid) {
      console.warn("[bootstrap] refresh token returned no user id");
      return;
    }

    const session: LocketSession = {
      userId: first.id,
      uid: tokens.uid,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
    };

    let profile = null;

    try {
      profile = await fetchLocketProfile(session, tokens.uid);
    } catch {
      // A missing profile only costs the display name.
    }

    await saveLocketAccount({
      userId: first.id,
      uid: tokens.uid,
      email: null,
      phone: null,
      displayName: profile
        ? `${profile.firstName} ${profile.lastName}`.trim() || profile.username
        : null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      idToken: tokens.idToken,
      idTokenExpiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    });

    console.log(`[bootstrap] linked Locket account ${tokens.uid}`);
  } catch (error) {
    console.error("[bootstrap] failed:", error instanceof Error ? error.message : error);
  }
}
