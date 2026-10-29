import postgres from "postgres";

/**
 * The deployment runs on serverless hosts (Vercel) where there is no writable
 * disk, so everything lives in Postgres: accounts, moments, uploaded photos and
 * the Locket connector settings.
 *
 * Set DATABASE_URL to a pooled connection string (Supabase "Transaction
 * pooler", port 6543). Prepared statements are disabled because transaction
 * pooling does not keep a session between queries.
 */
const SCHEMA = `
create table if not exists users (
  id text primary key,
  email text,
  phone text,
  username text not null,
  display_name text not null,
  password_hash text,
  avatar_file text,
  notifications_read_at text,
  created_at text not null
);

create unique index if not exists users_email_key on users (lower(email));
create unique index if not exists users_phone_key on users (phone);
create unique index if not exists users_username_key on users (lower(username));

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

-- Uploaded photos are stored as bytes because serverless hosts have no disk.
create table if not exists media (
  id text primary key,
  content_type text not null,
  bytes integer not null,
  data bytea not null,
  created_at text not null
);

create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at text not null
);

create table if not exists locket_accounts (
  user_id text primary key references users (id) on delete cascade,
  locket_uid text not null,
  email text,
  phone text,
  display_name text,
  username text,
  avatar_url text,
  id_token text,
  id_token_expires_at text,
  refresh_token text not null,
  linked_at text not null
);
`;

type Row = Record<string, unknown>;

export type PreparedStatement = {
  get: (...params: unknown[]) => Promise<Row | undefined>;
  all: (...params: unknown[]) => Promise<Row[]>;
  run: (...params: unknown[]) => Promise<void>;
};

type GlobalStore = typeof globalThis & {
  __locketSql?: postgres.Sql;
  __locketSchema?: Promise<void>;
};

function connect(): postgres.Sql {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Point it at a Postgres database (Supabase, Neon...).",
    );
  }

  return postgres(connectionString, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

export function getSql(): postgres.Sql {
  const store = globalThis as GlobalStore;
  store.__locketSql ??= connect();
  return store.__locketSql;
}

/** Creates the tables once per server process. */
export function ensureSchema(): Promise<void> {
  const store = globalThis as GlobalStore;
  store.__locketSchema ??= (async () => {
    await getSql().unsafe(SCHEMA);
  })().catch((error) => {
    // Let the next request retry instead of caching a permanent failure.
    store.__locketSchema = undefined;
    throw error;
  });

  return store.__locketSchema;
}

/** Turns sqlite style `?` placeholders into Postgres `$1, $2...`. */
function toPlaceholders(text: string): string {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
}

/**
 * Keeps the familiar `prepare(...).get/all/run` shape used across the app while
 * running on Postgres. Every call is async now, so callers await it.
 */
export function getDb(): { prepare: (text: string) => PreparedStatement } {
  return {
    prepare(text: string): PreparedStatement {
      const query = toPlaceholders(text);

      const execute = async (params: unknown[]): Promise<Row[]> => {
        await ensureSchema();
        const rows = await getSql().unsafe(query, params as never[]);
        return rows as unknown as Row[];
      };

      return {
        get: async (...params: unknown[]) => (await execute(params))[0],
        all: async (...params: unknown[]) => execute(params),
        run: async (...params: unknown[]) => {
          await execute(params);
        },
      };
    },
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}
