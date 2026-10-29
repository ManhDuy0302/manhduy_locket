import { fetchLocketProfile, getLatestLocketMoments, getLocketFriendUids, type LocketProfile } from "./api";
import { getLocketSession, locketErrorMessage, type LocketSession } from "./client";
import { getLocketAccount } from "./store";

export type LocketFeedMoment = {
  id: string;
  ownerUid: string;
  imageUrl: string | null;
  caption: string;
  createdAt: string;
  isMine: boolean;
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
};

export type LocketFeedState = {
  connected: boolean;
  accountLabel: string | null;
  moments: LocketFeedMoment[];
  error: string | null;
};

export type LocketFriend = {
  uid: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type LocketFriendsState = {
  connected: boolean;
  friends: LocketFriend[];
  error: string | null;
};

/**
 * The app re-renders every 20 seconds, and every Locket feed read costs one API
 * call plus one profile call per author. Short lived caches keep that polite.
 */
type CacheEntry<T> = { value: T; expiresAt: number };

const FEED_TTL_MS = 60_000;
const FRIENDS_TTL_MS = 5 * 60_000;
const PROFILE_TTL_MS = 10 * 60_000;

const feedCache = new Map<string, CacheEntry<LocketFeedState>>();
const friendsCache = new Map<string, CacheEntry<LocketFriendsState>>();
const profileCache = new Map<string, CacheEntry<LocketProfile | null>>();

function cacheGet<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function cacheSet<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
): T {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** Called after linking, unlinking or re-saving the server config. */
export function clearLocketCaches(userId?: string): void {
  if (userId) {
    feedCache.delete(userId);
    friendsCache.delete(userId);
    return;
  }

  feedCache.clear();
  friendsCache.clear();
  profileCache.clear();
}

async function resolveProfiles(
  session: LocketSession,
  uids: string[],
): Promise<Map<string, LocketProfile>> {
  const profiles = new Map<string, LocketProfile>();
  const now = Date.now();
  const missing: string[] = [];

  for (const uid of uids) {
    const cached = profileCache.get(uid);

    if (cached && cached.expiresAt > now) {
      if (cached.value) {
        profiles.set(uid, cached.value);
      }

      continue;
    }

    missing.push(uid);
  }

  if (missing.length === 0) {
    return profiles;
  }

  const settled = await Promise.allSettled(missing.map((uid) => fetchLocketProfile(session, uid)));

  settled.forEach((entry, index) => {
    if (entry.status !== "fulfilled") {
      return;
    }

    const uid = missing[index];
    profileCache.set(uid, { value: entry.value, expiresAt: now + PROFILE_TTL_MS });

    if (entry.value) {
      profiles.set(uid, entry.value);
    }
  });

  return profiles;
}

function displayName(profile: LocketProfile | undefined): string {
  if (!profile) {
    return "Locket friend";
  }

  const full = `${profile.firstName} ${profile.lastName}`.trim();

  return full || profile.username || "Locket friend";
}

/**
 * Reads the real friend feed from api.locketcamera.com. Never throws: the home
 * screen should still render the local feed when Locket is unreachable.
 */
export async function loadLocketFeed(userId: string): Promise<LocketFeedState> {
  const account = await getLocketAccount(userId);

  if (!account) {
    return { connected: false, accountLabel: null, moments: [], error: null };
  }

  const accountLabel = account.displayName ?? account.username ?? account.email ?? account.uid;
  const cached = cacheGet(feedCache, userId);

  if (cached) {
    return cached;
  }

  try {
    const session = await getLocketSession(userId);
    const moments = await getLatestLocketMoments(session);
    const ownerUids = Array.from(
      new Set(moments.map((moment) => moment.ownerUid).filter(Boolean)),
    ).slice(0, 15);
    const profiles = await resolveProfiles(session, ownerUids);

    return cacheSet(
      feedCache,
      userId,
      {
        connected: true,
        accountLabel,
        error: null,
        moments: moments.map((moment) => {
          const isMine = moment.ownerUid === account.uid;
          const profile = profiles.get(moment.ownerUid);

          return {
            id: moment.id,
            ownerUid: moment.ownerUid,
            imageUrl: moment.imageUrl,
            caption: moment.caption,
            createdAt: moment.createdAt,
            isMine,
            authorName: isMine
              ? (account.displayName ?? account.username ?? "You")
              : displayName(profile),
            authorHandle: isMine ? (account.username ?? "") : (profile?.username ?? ""),
            authorAvatar: isMine ? account.avatarUrl : (profile?.avatarUrl ?? null),
          };
        }),
      },
      FEED_TTL_MS,
    );
  } catch (error) {
    return {
      connected: true,
      accountLabel,
      moments: [],
      error: locketErrorMessage(error),
    };
  }
}

/** Friend list straight from Locket's Firestore, used to fill the friends tab. */
export async function loadLocketFriends(userId: string): Promise<LocketFriendsState> {
  const account = await getLocketAccount(userId);

  if (!account) {
    return { connected: false, friends: [], error: null };
  }

  const cachedFriends = cacheGet(friendsCache, userId);

  if (cachedFriends) {
    return cachedFriends;
  }

  try {
    const session = await getLocketSession(userId);
    const uids = (await getLocketFriendUids(session)).slice(0, 20);
    const profiles = await resolveProfiles(session, uids);

    return cacheSet(
      friendsCache,
      userId,
      {
        connected: true,
        error: null,
        friends: uids.map((uid) => {
          const profile = profiles.get(uid);

          return {
            uid,
            name: displayName(profile),
            username: profile?.username ?? "",
            avatarUrl: profile?.avatarUrl ?? null,
          };
        }),
      },
      FRIENDS_TTL_MS,
    );
  } catch (error) {
    return { connected: true, friends: [], error: locketErrorMessage(error) };
  }
}
