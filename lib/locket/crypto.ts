import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Firebase refresh tokens are as good as a password: whoever holds one can read
 * and post as the Locket user. They are encrypted with AES-256-GCM before they
 * touch the database.
 *
 * LOCKET_SECRET keeps the key stable across deployments. Serverless hosts have
 * no disk to store a generated key, so when LOCKET_SECRET is missing the key is
 * derived from DATABASE_URL, which is already a deployment secret.
 */
let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const secret = process.env.LOCKET_SECRET?.trim() || process.env.DATABASE_URL?.trim();

  if (!secret) {
    throw new Error(
      "Set LOCKET_SECRET (or DATABASE_URL) before linking a Locket account: the refresh token is stored encrypted.",
    );
  }

  cachedKey = createHash("sha256").update(secret).digest();
  return cachedKey;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptSecret(payload: string): string | null {
  const [version, iv, tag, data] = payload.split(":");

  if (version !== "v1" || !iv || !tag || !data) {
    return null;
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      loadKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
