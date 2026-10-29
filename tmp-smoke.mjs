import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const BASE = "https://locket-peach.vercel.app";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    }),
);

const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });
const [user] = await sql`select id from users order by created_at asc limit 1`;
const token = randomBytes(24).toString("base64url");
const hash = createHash("sha256").update(token).digest("hex");
await sql`insert into sessions (token_hash, user_id, created_at, expires_at)
          values (${hash}, ${user.id}, ${new Date().toISOString()}, ${new Date(Date.now() + 3600_000).toISOString()})`;

const cookie = { cookie: `locket_session=${token}` };

for (const [path, checks] of [
  ["/friends", ["Locket friends", "best friends", "Add a new friend"]],
  ["/", ["cdn.locketcamera.com", "Live from Locket"]],
]) {
  const res = await fetch(BASE + path, { headers: cookie, redirect: "manual" });
  const body = await res.text();
  console.log(path, "->", res.status, checks.map((c) => `${c}:${body.includes(c)}`).join(" | "));
}

for (const path of ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-icon.png"]) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  console.log(path, "->", res.status, res.headers.get("content-type"));
}

await sql`delete from sessions where token_hash = ${hash}`;
await sql.end();
