"use server";

import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { redirect } from "next/navigation";

import { createSession } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import { isPhoneNumber } from "@/lib/phone";
import { sendVerificationSms } from "@/lib/sms";

const CODE_TTL_MS = 10 * 60 * 1000;
const SIGNUP_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

export type RequestCodeResult =
  | { ok: true; phone: string; previewCode: string | null }
  | { ok: false; error: string };

export type VerifyCodeResult =
  | { ok: true; existing: true }
  | { ok: true; existing: false; signupToken: string }
  | { ok: false; error: string };

export type CompleteSignupInput = {
  phone: string;
  token: string;
  displayName: string;
  username: string;
  next?: string | null;
};

export type CompleteSignupResult = { ok: false; error: string } | { ok: true };

type CodeRow = {
  phone: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  last_sent_at: string;
  send_count: number;
  window_started_at: string;
  signup_token: string | null;
  signup_expires_at: string | null;
};

function hashCode(phone: string, code: string): string {
  const secret = process.env.OTP_SECRET ?? "locket-local";
  return createHash("sha256").update(`${phone}:${code}:${secret}`).digest("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sameHash(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeNext(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export async function requestPhoneCode(input: string): Promise<RequestCodeResult> {
  const phone = input.trim();

  if (!isPhoneNumber(phone)) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const db = getDb();
  const now = Date.now();
  const nowStamp = new Date(now).toISOString();

  await db.prepare(
    `delete from phone_codes
     where expires_at <= ? and (signup_expires_at is null or signup_expires_at <= ?)`,
  ).run(nowStamp, nowStamp);

  const row = (await db
    .prepare("select * from phone_codes where phone = ?")
    .get(phone)) as CodeRow | undefined;

  if (row) {
    const waited = now - Date.parse(row.last_sent_at);

    if (waited < RESEND_COOLDOWN_MS) {
      const seconds = Math.ceil((RESEND_COOLDOWN_MS - waited) / 1000);
      return {
        ok: false,
        error: `Wait ${seconds}s before asking for another code.`,
      };
    }

    const windowOpen = now - Date.parse(row.window_started_at) < SEND_WINDOW_MS;

    if (windowOpen && row.send_count >= MAX_SENDS_PER_WINDOW) {
      return {
        ok: false,
        error: "Too many codes requested for this number. Try again later.",
      };
    }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const outcome = await sendVerificationSms(phone, code);

  if (outcome === "failed") {
    return {
      ok: false,
      error: "We couldn't send the text message. Try again in a moment.",
    };
  }

  const windowOpen = Boolean(
    row && now - Date.parse(row.window_started_at) < SEND_WINDOW_MS,
  );
  const windowStartedAt = row && windowOpen ? row.window_started_at : nowStamp;
  const sendCount = (row && windowOpen ? row.send_count : 0) + 1;

  await db.prepare(
    `insert into phone_codes
       (phone, code_hash, expires_at, attempts, last_sent_at, send_count, window_started_at)
     values (?, ?, ?, 0, ?, ?, ?)
     on conflict (phone) do update set
       code_hash = excluded.code_hash,
       expires_at = excluded.expires_at,
       attempts = 0,
       last_sent_at = excluded.last_sent_at,
       send_count = excluded.send_count,
       window_started_at = excluded.window_started_at,
       signup_token = null,
       signup_expires_at = null`,
  ).run(
    phone,
    hashCode(phone, code),
    new Date(now + CODE_TTL_MS).toISOString(),
    nowStamp,
    sendCount,
    windowStartedAt,
  );

  return {
    ok: true,
    phone,
    previewCode: outcome === "not-configured" ? code : null,
  };
}

export async function verifyPhoneCode(
  phone: string,
  code: string,
  next?: string | null,
): Promise<VerifyCodeResult> {
  if (!isPhoneNumber(phone)) {
    return { ok: false, error: "Enter your phone number again." };
  }

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  const db = getDb();
  const now = Date.now();
  const row = (await db
    .prepare("select * from phone_codes where phone = ?")
    .get(phone)) as CodeRow | undefined;

  if (!row) {
    return { ok: false, error: "That code expired. Request a new one." };
  }

  if (Date.parse(row.expires_at) <= now) {
    await db.prepare("delete from phone_codes where phone = ?").run(phone);
    return { ok: false, error: "That code expired. Request a new one." };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await db.prepare("delete from phone_codes where phone = ?").run(phone);
    return { ok: false, error: "Too many tries. Request a new code." };
  }

  if (!sameHash(row.code_hash, hashCode(phone, code))) {
    const attempts = row.attempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
      await db.prepare("delete from phone_codes where phone = ?").run(phone);
      return { ok: false, error: "Too many tries. Request a new code." };
    }

    await db.prepare("update phone_codes set attempts = ? where phone = ?").run(
      attempts,
      phone,
    );
    return { ok: false, error: "That code isn't right. Try again." };
  }

  const user = (await db.prepare("select id from users where phone = ?").get(phone)) as
    | { id: string }
    | undefined;

  if (user) {
    await db.prepare("delete from phone_codes where phone = ?").run(phone);
    await createSession(user.id);
    redirect(safeNext(next) ?? "/");
  }

  const signupToken = randomBytes(24).toString("base64url");

  await db.prepare(
    `update phone_codes set signup_token = ?, signup_expires_at = ?, attempts = 0
     where phone = ?`,
  ).run(
    signupToken,
    new Date(now + SIGNUP_TTL_MS).toISOString(),
    phone,
  );

  return { ok: true, existing: false, signupToken };
}

export async function completePhoneSignup(
  input: CompleteSignupInput,
): Promise<CompleteSignupResult> {
  const phone = input.phone.trim();
  const token = input.token.trim();
  const displayName = input.displayName.trim();
  const username = input.username.trim().toLowerCase();

  if (!isPhoneNumber(phone) || !token) {
    return { ok: false, error: "Verify your number again." };
  }

  if (displayName.length < 1 || displayName.length > 30) {
    return { ok: false, error: "Your name should be between 1 and 30 characters." };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, error: "Usernames use 3–20 letters, numbers, dots or underscores." };
  }

  const db = getDb();
  const row = (await db
    .prepare("select * from phone_codes where phone = ?")
    .get(phone)) as CodeRow | undefined;

  if (
    !row ||
    !row.signup_token ||
    !row.signup_expires_at ||
    Date.parse(row.signup_expires_at) <= Date.now() ||
    !sameHash(hashToken(row.signup_token), hashToken(token))
  ) {
    return { ok: false, error: "Your verification expired. Start again." };
  }

  const takenPhone = await db
    .prepare("select 1 as found from users where phone = ?")
    .get(phone);
  const takenUsername = await db
    .prepare("select 1 as found from users where lower(username) = lower(?)")
    .get(username);

  if (takenPhone) {
    return { ok: false, error: "This number already has an account. Log in instead." };
  }

  if (takenUsername) {
    return { ok: false, error: "That username is taken. Try another one." };
  }

  const id = randomUUID();

  try {
    await db
      .prepare(
        `insert into users (id, phone, username, display_name, created_at)
         values (?, ?, ?, ?, ?)`,
      )
      .run(id, phone, username, displayName, nowIso());
  } catch {
    return { ok: false, error: "We couldn't create your account. Try again." };
  }

  await db.prepare("delete from phone_codes where phone = ?").run(phone);
  await createSession(id);
  redirect(safeNext(input.next) ?? "/friends");
}
