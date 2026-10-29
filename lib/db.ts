import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Locket stores everything locally in a SQLite database so the app works out
 * of the box. Set LOCKET_DATA_DIR to move the database and the uploaded photos
 * somewhere else (for example a mounted disk on a VPS).
 */
export const DATA_DIR = process.env.LOCKET_DATA_DIR
  ? join(process.env.LOCKET_DATA_DIR)
  : join(process.cwd(), ".data");

export const UPLOAD_DIR = join(DATA_DIR, "uploads");

const SCHEMA = `
create table if not exists users (
  id text primary key,
  email text collate nocase unique,
  phone text unique,
  username text not null collate nocase unique,
  display_name text not null,
  password_hash text,
  avatar_file text,
  notifications_read_at text,
  created_at text not null
);

create table if not exists phone_codes (
  phone text primary key,
  code_hash text not null,
  expires_at text not null,
  attempts integer not null default 0,
  last_sent_at text not null,
  send_count integer not null default 0,
  window_started_at text not null,
  signup_token text,
  signup_expires_at text
);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  created_at text not null,
  expires_at text not null
);

create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists friendships (
  user_id text not null references users (id) on delete cascade,
  friend_id text not null references users (id) on delete cascade,
  created_at text not null,
  primary key (user_id, friend_id)
);

create index if not exists friendships_friend_idx on friendships (friend_id);

create table if not exists friend_requests (
  from_id text not null references users (id) on delete cascade,
  to_id text not null references users (id) on delete cascade,
  created_at text not null,
  primary key (from_id, to_id)
);

create index if not exists friend_requests_to_idx on friend_requests (to_id);

create table if not exists moments (
  id text primary key,
  user_id text not null references users (id) on delete cascade,
  file text not null,
  created_at text not null
);

create index if not exists moments_user_idx on moments (user_id, created_at desc);

create table if not exists moment_reactions (
  moment_id text not null references moments (id) on delete cascade,
  user_id text not null references users (id) on delete cascade,
  emoji text not null,
  created_at text not null,
  primary key (moment_id, user_id)
);

create index if not exists moment_reactions_user_idx on moment_reactions (user_id);
`;

type GlobalWithDb = typeof globalThis & { __locketDb?: DatabaseSync };

/**
 * Earlier versions only supported email accounts. Rebuild the table once so
 * phone numbers can be used on their own (email and password become optional).
 */
function migratePhoneAuth(db: DatabaseSync) {
  const columns = db.prepare("pragma table_info(users)").all() as { name: string }[];

  if (columns.some((column) => column.name === "phone")) {
    return;
  }

  db.exec("pragma foreign_keys = off");

  try {
    db.exec("begin");
    db.exec(`
      create table users_with_phone (
        id text primary key,
        email text collate nocase unique,
        phone text unique,
        username text not null collate nocase unique,
        display_name text not null,
        password_hash text,
        avatar_file text,
        notifications_read_at text,
        created_at text not null
      )
    `);
    db.exec(`
      insert into users_with_phone
        (id, email, username, display_name, password_hash, avatar_file, notifications_read_at, created_at)
      select id, email, username, display_name, password_hash, avatar_file, notifications_read_at, created_at
      from users
    `);
    db.exec("drop table users");
    db.exec("alter table users_with_phone rename to users");
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  } finally {
    db.exec("pragma foreign_keys = on");
  }

  const broken = db.prepare("pragma foreign_key_check").all();

  if (broken.length > 0) {
    throw new Error("Phone login migration broke existing rows.");
  }
}

export function getDb(): DatabaseSync {
  const globalStore = globalThis as GlobalWithDb;

  if (!globalStore.__locketDb) {
    mkdirSync(UPLOAD_DIR, { recursive: true });

    const db = new DatabaseSync(join(DATA_DIR, "locket.db"));
    db.exec("pragma journal_mode = wal");
    db.exec("pragma foreign_keys = on");
    db.exec("pragma busy_timeout = 5000");
    db.exec(SCHEMA);
    migratePhoneAuth(db);

    globalStore.__locketDb = db;
  }

  return globalStore.__locketDb;
}

export function nowIso(): string {
  return new Date().toISOString();
}
