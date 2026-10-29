import { getDb } from "../db";
import { decryptSecret, encryptSecret } from "./crypto";

/**
 * Two extra tables power the Locket connector:
 *
 * - app_settings holds the operator level config (Firebase API key, App Check
 *   token...) so it can be pasted in the UI instead of editing .env.
 * - locket_accounts links a local account to a real Locket account and keeps
 *   the encrypted Firebase refresh token used to mint fresh ID tokens.
 *
 * The tables are created by lib/db.ts, so no extra migration step is needed.
 */
export async function readSetting(key: string): Promise<string | null> {
  const row = (await getDb()
    .prepare("select value from app_settings where key = ?")
    .get(key)) as { value: string } | undefined;

  return row?.value ?? null;
}

export async function writeSetting(key: string, value: string): Promise<void> {
  await getDb()
    .prepare(
      `insert into app_settings (key, value, updated_at) values (?, ?, ?)
       on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, new Date().toISOString());
}

type AccountRow = {
  user_id: string;
  locket_uid: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  id_token: string | null;
  id_token_expires_at: string | null;
  refresh_token: string;
  linked_at: string;
};

export type LocketAccount = {
  userId: string;
  uid: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  idToken: string | null;
  idTokenExpiresAt: string | null;
  refreshToken: string;
  linkedAt: string;
};

function toAccount(row: AccountRow): LocketAccount {
  return {
    userId: row.user_id,
    uid: row.locket_uid,
    email: row.email,
    phone: row.phone,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    idToken: row.id_token,
    idTokenExpiresAt: row.id_token_expires_at,
    refreshToken: decryptSecret(row.refresh_token) ?? "",
    linkedAt: row.linked_at,
  };
}

export async function getLocketAccount(userId: string): Promise<LocketAccount | null> {
  const row = (await getDb()
    .prepare("select * from locket_accounts where user_id = ?")
    .get(userId)) as AccountRow | undefined;

  if (!row) {
    return null;
  }

  const account = toAccount(row);

  return account.refreshToken ? account : null;
}

export type LocketAccountInput = {
  userId: string;
  uid: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  idToken: string;
  idTokenExpiresAt: string;
  refreshToken: string;
};

export async function saveLocketAccount(input: LocketAccountInput): Promise<void> {
  await getDb()
    .prepare(
      `insert into locket_accounts
         (user_id, locket_uid, email, phone, display_name, username, avatar_url,
          id_token, id_token_expires_at, refresh_token, linked_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict (user_id) do update set
         locket_uid = excluded.locket_uid,
         email = excluded.email,
         phone = excluded.phone,
         display_name = excluded.display_name,
         username = excluded.username,
         avatar_url = excluded.avatar_url,
         id_token = excluded.id_token,
         id_token_expires_at = excluded.id_token_expires_at,
         refresh_token = excluded.refresh_token`,
    )
    .run(
      input.userId,
      input.uid,
      input.email,
      input.phone,
      input.displayName,
      input.username,
      input.avatarUrl,
      input.idToken,
      input.idTokenExpiresAt,
      encryptSecret(input.refreshToken),
      new Date().toISOString(),
    );
}

export async function updateLocketTokens(
  userId: string,
  tokens: { idToken: string; idTokenExpiresAt: string; refreshToken: string },
): Promise<void> {
  await getDb()
    .prepare(
      `update locket_accounts
       set id_token = ?, id_token_expires_at = ?, refresh_token = ?
       where user_id = ?`,
    )
    .run(
      tokens.idToken,
      tokens.idTokenExpiresAt,
      encryptSecret(tokens.refreshToken),
      userId,
    );
}

export async function deleteLocketAccount(userId: string): Promise<void> {
  await getDb().prepare("delete from locket_accounts where user_id = ?").run(userId);
}
