import { getDb } from "../db";

/**
 * Locket's Firebase config is shared by every account on this deployment, so
 * only the operator should be able to change it. ADMIN_USERNAMES lists who is
 * allowed; when it is empty the first account that ever signed up counts as the
 * owner.
 */
export async function isLocketAdmin(user: {
  id: string;
  username: string;
}): Promise<boolean> {
  const allowed = (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((value) => value.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);

  if (allowed.length > 0) {
    return allowed.includes(user.username.toLowerCase());
  }

  const first = (await getDb()
    .prepare("select id from users order by created_at asc, id asc limit 1")
    .get()) as { id: string } | undefined;

  return first?.id === user.id;
}
