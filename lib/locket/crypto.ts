import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DATA_DIR } from "../db";

/**
 * Firebase refresh tokens are as good as a password: whoever holds one can read
 * and post as the Locket user. They are encrypted with AES-256-GCM before they
 * touch the SQLite file.
 *
 * LOCKET_SECRET keeps the key stable across deployments; without it a random
 * key is generated once inside the data folder.
 */
let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const fromEnv = process.env.LOCKET_SECRET?.trim();

  if (fromEnv) {
    cachedKey = createHash("sha256").update(fromEnv).digest();
    return cachedKey;
  }

  const secretFile = join(DATA_DIR, "locket-secret");

  try {
    const stored = Buffer.from(readFileSync(secretFile, "utf8").trim(), "hex");

    if (stored.length === 32) {
      cachedKey = stored;
      return cachedKey;
    }
  } catch {
    // First run: the key file does not exist yet.
  }

  const generated = randomBytes(32);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(secretFile, generated.toString("hex"), { mode: 0o600 });

  cachedKey = generated;
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
