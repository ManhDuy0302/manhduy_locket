import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });

const users = await sql`select id, username from users order by created_at asc limit 1`;
const accounts = await sql`select locket_uid, display_name, username from locket_accounts`;
console.log("users:", users.map((u) => `@${u.username}`).join(", ") || "(none)");
console.log("locket accounts:", accounts.map((a) => `${a.username ?? a.locket_uid} (${a.display_name ?? "-"})`).join(", ") || "(none)");

const token = randomBytes(24).toString("base64url");
const hash = createHash("sha256").update(token).digest("hex");
await sql`insert into sessions (token_hash, user_id, created_at, expires_at)
          values (${hash}, ${users[0].id}, ${new Date().toISOString()}, ${new Date(Date.now() + 3600_000).toISOString()})`;

for (const path of ["/", "/locket", "/friends", "/history", "/notifications"]) {
  const res = await fetch(`http://localhost:3000${path}`, {
    headers: { cookie: `locket_session=${token}` },
    redirect: "manual",
  });
  const body = await res.text();
  const flags = [
    body.includes("Live from Locket") ? "live-feed" : "",
    body.includes("linked") || body.includes("Linked") ? "linked" : "",
    body.includes("mdyyyy") ? "handle" : "",
    body.includes("cdn.locketcamera.com") ? "photo" : "",
  ].filter(Boolean);
  console.log(path, "->", res.status, flags.join(","));
}

await sql`delete from sessions where token_hash = ${hash}`;
await sql.end();
