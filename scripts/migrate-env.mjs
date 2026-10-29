import { readFileSync, writeFileSync } from "node:fs";
import { createDecipheriv } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";

const OLD_SECRET_FILE = ".data/locket-secret";
const key = Buffer.from(readFileSync(OLD_SECRET_FILE, "utf8").trim(), "hex");

function decrypt(payload) {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1") return null;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

const db = new DatabaseSync(".data/locket.db");
const account = db.prepare("select refresh_token from locket_accounts limit 1").get();
const settings = db.prepare("select value from app_settings where key = 'locket.config'").get();
const refreshToken = account ? decrypt(account.refresh_token) : null;
const apiKey = settings ? (JSON.parse(settings.value).apiKey ?? "") : "";

const lines = [
  `DATABASE_URL=postgresql://postgres.rsvcnqjswuckzzvyiqjo:iuoTXj3TAPIy7AV1@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `LOCKET_FIREBASE_API_KEY=${apiKey}`,
  `LOCKET_SECRET=${randomBytes(32).toString("hex")}`,
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000`,
  `BOOTSTRAP_OWNER_EMAIL=owner@locket.local`,
  `BOOTSTRAP_OWNER_PASSWORD=locket-owner`,
  `BOOTSTRAP_OWNER_USERNAME=owner`,
  `BOOTSTRAP_OWNER_NAME=Owner`,
  `BOOTSTRAP_LOCKET_REFRESH_TOKEN=${refreshToken ?? ""}`,
  "",
];

writeFileSync(".env.local", lines.join("\n"));
console.log("wrote .env.local");
console.log("apiKey present:", Boolean(apiKey), "| refresh token recovered:", Boolean(refreshToken));
