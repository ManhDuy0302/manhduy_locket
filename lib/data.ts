import { getDb } from "./db";

export const MAX_FRIENDS = 20;

export type Person = {
  id: string;
  username: string;
  displayName: string;
  avatarFile: string | null;
};

export type Reaction = {
  userId: string;
  emoji: string;
  createdAt: string;
  person: Person;
};

export type Moment = {
  id: string;
  imageFile: string;
  createdAt: string;
  author: Person;
  reactions: Reaction[];
  myReaction: string | null;
  isMine: boolean;
};

export type FriendRequest = {
  person: Person;
  createdAt: string;
};

export type NotificationItem =
  | { kind: "request"; id: string; person: Person; createdAt: string; unread: boolean }
  | {
      kind: "reaction";
      id: string;
      person: Person;
      emoji: string;
      createdAt: string;
      unread: boolean;
      momentId: string;
      momentFile: string;
    };

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_file: string | null;
};

type MomentRow = {
  id: string;
  file: string;
  created_at: string;
  author_id: string;
  username: string;
  display_name: string;
  avatar_file: string | null;
};

type ReactionRow = {
  moment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_file: string | null;
};

function toPerson(row: UserRow): Person {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarFile: row.avatar_file,
  };
}

export function areFriends(userId: string, otherId: string): boolean {
  const row = getDb()
    .prepare("select 1 as found from friendships where user_id = ? and friend_id = ?")
    .get(userId, otherId);

  return Boolean(row);
}

export function getFriends(userId: string): Person[] {
  const rows = getDb()
    .prepare(
      `select u.id, u.username, u.display_name, u.avatar_file
       from friendships f
       join users u on u.id = f.friend_id
       where f.user_id = ?
       order by u.display_name collate nocase asc`,
    )
    .all(userId) as UserRow[];

  return rows.map(toPerson);
}

export function getFriendCount(userId: string): number {
  const row = getDb()
    .prepare("select count(*) as total from friendships where user_id = ?")
    .get(userId) as { total: number };

  return row.total;
}

export function getFeedMoments(
  viewerId: string,
  scope: "everyone" | "mine",
): Moment[] {
  const db = getDb();

  const rows =
    scope === "mine"
      ? (db
          .prepare(
            `select m.id, m.file, m.created_at,
                    u.id as author_id, u.username, u.display_name, u.avatar_file
             from moments m
             join users u on u.id = m.user_id
             where m.user_id = ?
             order by m.created_at desc
             limit 60`,
          )
          .all(viewerId) as MomentRow[])
      : (db
          .prepare(
            `select m.id, m.file, m.created_at,
                    u.id as author_id, u.username, u.display_name, u.avatar_file
             from moments m
             join users u on u.id = m.user_id
             where m.user_id = ?
                or m.user_id in (select friend_id from friendships where user_id = ?)
             order by m.created_at desc
             limit 60`,
          )
          .all(viewerId, viewerId) as MomentRow[]);

  if (rows.length === 0) {
    return [];
  }

  const placeholders = rows.map(() => "?").join(", ");
  const reactionRows = db
    .prepare(
      `select r.moment_id, r.user_id, r.emoji, r.created_at,
              u.username, u.display_name, u.avatar_file
       from moment_reactions r
       join users u on u.id = r.user_id
       where r.moment_id in (${placeholders})
       order by r.created_at desc`,
    )
    .all(...rows.map((row) => row.id)) as ReactionRow[];

  const reactionsByMoment = new Map<string, Reaction[]>();

  for (const row of reactionRows) {
    const list = reactionsByMoment.get(row.moment_id) ?? [];
    list.push({
      userId: row.user_id,
      emoji: row.emoji,
      createdAt: row.created_at,
      person: toPerson({
        id: row.user_id,
        username: row.username,
        display_name: row.display_name,
        avatar_file: row.avatar_file,
      }),
    });
    reactionsByMoment.set(row.moment_id, list);
  }

  return rows.map((row) => {
    const reactions = reactionsByMoment.get(row.id) ?? [];

    return {
      id: row.id,
      imageFile: row.file,
      createdAt: row.created_at,
      author: toPerson({
        id: row.author_id,
        username: row.username,
        display_name: row.display_name,
        avatar_file: row.avatar_file,
      }),
      reactions,
      myReaction: reactions.find((reaction) => reaction.userId === viewerId)?.emoji ?? null,
      isMine: row.author_id === viewerId,
    };
  });
}

export function getHistoryMoments(userId: string, limit = 120): Moment[] {
  const rows = getDb()
    .prepare(
      `select m.id, m.file, m.created_at,
              u.id as author_id, u.username, u.display_name, u.avatar_file
       from moments m
       join users u on u.id = m.user_id
       where m.user_id = ?
       order by m.created_at desc
       limit ?`,
    )
    .all(userId, limit) as MomentRow[];

  return rows.map((row) => ({
    id: row.id,
    imageFile: row.file,
    createdAt: row.created_at,
    author: toPerson({
      id: row.author_id,
      username: row.username,
      display_name: row.display_name,
      avatar_file: row.avatar_file,
    }),
    reactions: [],
    myReaction: null,
    isMine: true,
  }));
}

export function getLatestMomentFile(userId: string): string | null {
  const row = getDb()
    .prepare(
      "select file from moments where user_id = ? order by created_at desc limit 1",
    )
    .get(userId) as { file: string } | undefined;

  return row?.file ?? null;
}

export function getIncomingRequests(userId: string): FriendRequest[] {
  const rows = getDb()
    .prepare(
      `select r.created_at, u.id, u.username, u.display_name, u.avatar_file
       from friend_requests r
       join users u on u.id = r.from_id
       where r.to_id = ?
       order by r.created_at desc`,
    )
    .all(userId) as (UserRow & { created_at: string })[];

  return rows.map((row) => ({
    person: toPerson(row),
    createdAt: row.created_at,
  }));
}

export function getRelationships(userId: string): {
  friends: Set<string>;
  incoming: Set<string>;
  outgoing: Set<string>;
} {
  const db = getDb();

  const friends = db
    .prepare("select friend_id as id from friendships where user_id = ?")
    .all(userId) as { id: string }[];
  const incoming = db
    .prepare("select from_id as id from friend_requests where to_id = ?")
    .all(userId) as { id: string }[];
  const outgoing = db
    .prepare("select to_id as id from friend_requests where from_id = ?")
    .all(userId) as { id: string }[];

  return {
    friends: new Set(friends.map((row) => row.id)),
    incoming: new Set(incoming.map((row) => row.id)),
    outgoing: new Set(outgoing.map((row) => row.id)),
  };
}

export function searchUsers(userId: string, query: string): Person[] {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return [];
  }

  const rows = getDb()
    .prepare(
      `select id, username, display_name, avatar_file
       from users
       where id <> ?
         and (lower(username) like ? or lower(display_name) like ?)
       order by case when lower(username) = ? then 0 else 1 end, username collate nocase asc
       limit 8`,
    )
    .all(userId, `${trimmed}%`, `%${trimmed}%`, trimmed) as UserRow[];

  return rows.map(toPerson);
}

export function getUserByUsername(username: string): Person | null {
  const row = getDb()
    .prepare(
      "select id, username, display_name, avatar_file from users where username = ?",
    )
    .get(username) as UserRow | undefined;

  return row ? toPerson(row) : null;
}

function getUnreadReactionCount(user: { id: string; notificationsReadAt: string | null }): number {
  const row = getDb()
    .prepare(
      `select count(*) as total
       from moment_reactions r
       join moments m on m.id = r.moment_id
       where m.user_id = ? and r.user_id <> ? and r.created_at > ?`,
    )
    .get(user.id, user.id, user.notificationsReadAt ?? "1970-01-01T00:00:00.000Z") as {
    total: number;
  };

  return row.total;
}

export function getNotificationBadge(user: {
  id: string;
  notificationsReadAt: string | null;
}): number {
  const requests = getIncomingRequests(user.id).length;
  return requests + getUnreadReactionCount(user);
}

export function getNotifications(user: {
  id: string;
  notificationsReadAt: string | null;
}): NotificationItem[] {
  const readAt = user.notificationsReadAt ?? "1970-01-01T00:00:00.000Z";

  const reactionRows = getDb()
    .prepare(
      `select r.moment_id, r.user_id, r.emoji, r.created_at,
              u.username, u.display_name, u.avatar_file,
              m.file as moment_file
       from moment_reactions r
       join moments m on m.id = r.moment_id
       join users u on u.id = r.user_id
       where m.user_id = ? and r.user_id <> ?
       order by r.created_at desc
       limit 40`,
    )
    .all(user.id, user.id) as (ReactionRow & { moment_file: string })[];

  const items: NotificationItem[] = [
    ...getIncomingRequests(user.id).map((request) => ({
      kind: "request" as const,
      id: request.person.id,
      person: request.person,
      createdAt: request.createdAt,
      unread: true,
    })),
    ...reactionRows.map((row) => ({
      kind: "reaction" as const,
      id: row.moment_id,
      person: toPerson({
        id: row.user_id,
        username: row.username,
        display_name: row.display_name,
        avatar_file: row.avatar_file,
      }),
      emoji: row.emoji,
      createdAt: row.created_at,
      unread: row.created_at > readAt,
      momentId: row.moment_id,
      momentFile: row.moment_file,
    })),
  ];

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
