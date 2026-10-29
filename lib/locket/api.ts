import { createHash, randomUUID } from "node:crypto";

import { firestoreGet, locketPost, LocketError, type LocketSession } from "./client";
import { LOCKET_DEFAULTS } from "./defaults";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Locket serves media from a CDN; the Firebase host needs an auth token. */
export function toCdnUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  return url.replace("https://firebasestorage.googleapis.com", LOCKET_DEFAULTS.cdnBase);
}

export type LocketProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string | null;
};

export async function fetchLocketProfile(
  session: LocketSession,
  uid: string,
): Promise<LocketProfile | null> {
  const payload = await locketPost(session, "fetchUserV2", { data: { user_uid: uid } });
  const result = asRecord(asRecord(payload)?.result);
  const data = asRecord(result?.data) ?? asRecord(asRecord(payload)?.data);

  if (!data) {
    return null;
  }

  const profileUid = asString(data.uid) ?? uid;

  return {
    uid: profileUid,
    firstName: asString(data.first_name) ?? "",
    lastName: asString(data.last_name) ?? "",
    username: asString(data.username) ?? "",
    avatarUrl: toCdnUrl(asString(data.profile_picture_url)),
  };
}

export type LocketMoment = {
  id: string;
  ownerUid: string;
  imageUrl: string | null;
  videoUrl: string | null;
  caption: string;
  createdAt: string;
  sentToAll: boolean;
};

function toIso(value: unknown): string {
  if (typeof value === "string") {
    const parsed = Date.parse(value);

    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  }

  const record = asRecord(value);
  const seconds = Number(record?._seconds ?? record?.seconds);

  if (Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000).toISOString();
  }

  return new Date(0).toISOString();
}

function momentArray(payload: unknown): unknown[] {
  const body = asRecord(payload);
  const result = asRecord(body?.result);
  const candidates = [result?.data, body?.data, result];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    const nested = asRecord(candidate);

    if (!nested) {
      continue;
    }

    for (const key of ["data", "moments", "posts"]) {
      const value = nested[key];

      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

function normalizeMoment(value: unknown): LocketMoment | null {
  const moment = asRecord(value);

  if (!moment) {
    return null;
  }

  const id = asString(moment.id) ?? asString(moment.moment_uid) ?? asString(moment.canonical_uid);

  if (!id) {
    return null;
  }

  const overlay = asRecord(asArray(moment.overlays)[0]);
  const overlayData = asRecord(overlay?.data);
  const caption =
    asString(overlayData?.text) ??
    asString(asRecord(overlay?.alt_text)?.stringValue) ??
    asString(moment.caption) ??
    "";

  return {
    id,
    ownerUid: asString(moment.user) ?? "",
    imageUrl: toCdnUrl(asString(moment.image_url) ?? asString(moment.thumbnail_url)),
    videoUrl: toCdnUrl(asString(moment.video_url)),
    caption,
    createdAt: toIso(moment.date ?? moment.created_at ?? moment.create_time),
    sentToAll: Boolean(moment.sent_to_all),
  };
}

/** `getLatestMomentV2` — the friend feed the iOS home screen shows. */
export async function getLatestLocketMoments(session: LocketSession): Promise<LocketMoment[]> {
  const payload = await locketPost(session, "getLatestMomentV2", {
    data: {
      excluded_users: [],
      fetch_streak: true,
      should_count_missed_moments: true,
    },
  });

  const seen = new Set<string>();
  const moments: LocketMoment[] = [];

  for (const raw of momentArray(payload)) {
    const moment = normalizeMoment(raw);

    if (!moment || seen.has(moment.id)) {
      continue;
    }

    seen.add(moment.id);
    moments.push(moment);
  }

  return moments
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);
}

/** Friend UIDs live in Locket's Firestore `users/{uid}/friends` collection. */
export async function getLocketFriendUids(session: LocketSession): Promise<string[]> {
  const uids: string[] = [];
  let pageToken: string | null = null;
  let page = 0;

  do {
    const query = new URLSearchParams({ pageSize: "100" });

    if (pageToken) {
      query.set("pageToken", pageToken);
    }

    const payload = await firestoreGet(
      session,
      `(default)/documents/users/${encodeURIComponent(session.uid)}/friends?${query.toString()}`,
    );
    const body = asRecord(payload);
    const documents = asArray(body?.documents);

    for (const document of documents) {
      const user = asString(asRecord(asRecord(asRecord(document)?.fields)?.user)?.stringValue);

      if (user) {
        uids.push(user);
      }
    }

    pageToken = asString(body?.nextPageToken);
    page += 1;
  } while (pageToken && page < 5);

  return Array.from(new Set(uids));
}

function intValue(value: number): { "@type": string; value: string } {
  return {
    "@type": "type.googleapis.com/google.protobuf.Int64Value",
    value: value.toString(),
  };
}

/** Telemetry blob Locket expects on every new moment. */
function analyticsPayload(): Record<string, unknown> {
  return {
    experiments: {
      flag_4: intValue(43),
      flag_10: intValue(505),
      flag_23: intValue(400),
      flag_22: intValue(1203),
      flag_19: intValue(52),
      flag_18: intValue(1203),
      flag_16: intValue(303),
      flag_15: intValue(501),
      flag_14: intValue(500),
      flag_25: intValue(23),
    },
    amplitude: {
      device_id: randomUUID(),
      session_id: intValue(Date.now()),
    },
    google_analytics: {
      app_instance_id: "5BDC04DA16FF4B0C9CA14FFB9C502900",
    },
    platform: "ios",
  };
}

/** Streak counter is keyed on the Vietnamese calendar day, like the app. */
function streakDayStamp(): number {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return Number(formatted.replaceAll("-", ""));
}

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

async function uploadLocketImage(
  session: LocketSession,
  data: Uint8Array,
  contentType: string,
): Promise<string> {
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const objectPath = `users/${session.uid}/moments/thumbnails/${randomUUID()}.${extension}`;
  const objectUrl = `https://firebasestorage.googleapis.com/v0/b/${LOCKET_DEFAULTS.storageBucket}/o/${encodeURIComponent(objectPath)}`;
  const start = await fetch(
    `${objectUrl}?uploadType=resumable&name=${encodeURIComponent(objectPath)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        authorization: `Bearer ${session.idToken}`,
        "x-goog-upload-protocol": "resumable",
        accept: "*/*",
        "x-goog-upload-command": "start",
        "x-goog-upload-content-length": String(data.byteLength),
        "x-goog-upload-content-type": contentType,
        "x-firebase-storage-version": "ios/10.13.0",
        "x-firebase-gmpid": LOCKET_DEFAULTS.gmpid,
        "user-agent": LOCKET_DEFAULTS.uploaderUserAgent,
      },
      body: JSON.stringify({
        name: objectPath,
        contentType,
        bucket: "",
        metadata: { creator: session.uid, visibility: "private" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    },
  );

  const uploadUrl = start.headers.get("x-goog-upload-url");

  if (!start.ok || !uploadUrl) {
    throw new LocketError("Firebase Storage refused the upload. Reconnect your Locket account.", {
      status: start.status,
    });
  }

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": contentType,
      "x-goog-upload-offset": "0",
      "x-goog-upload-command": "upload, finalize",
    },
    // Node's fetch accepts any byte array; the DOM typings are narrower.
    body: data as unknown as BodyInit,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!upload.ok) {
    throw new LocketError("Uploading the photo to Locket's storage failed.", {
      status: upload.status,
    });
  }

  const metadata = await fetch(objectUrl, {
    headers: {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${session.idToken}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const metaBody = asRecord(await metadata.json().catch(() => null));
  const token = asString(metaBody?.downloadTokens);

  if (!metadata.ok || !token) {
    throw new LocketError("Locket storage didn't return a download token.", {
      status: metadata.status,
    });
  }

  return `${objectUrl}?alt=media&token=${token}`;
}

export type PostLocketImageInput = {
  data: Uint8Array;
  contentType: string;
  audience: "friends" | "private";
  recipients?: string[];
  caption?: string;
};

/** Uploads a photo then publishes it with `postMomentV2`. */
export async function postImageToLocket(
  session: LocketSession,
  input: PostLocketImageInput,
): Promise<{ id: string; imageUrl: string }> {
  const imageUrl = await uploadLocketImage(session, input.data, input.contentType);
  const caption = input.caption?.trim() ?? "";
  const privatePost = input.audience === "private";

  const data: Record<string, unknown> = {
    thumbnail_url: imageUrl,
    md5: md5(imageUrl),
    show_personally: false,
    analytics: analyticsPayload(),
    overlays: caption
      ? [
          {
            data: {
              text: caption,
              text_color: "#FFFFFFE6",
              type: "standard",
              max_lines: 4,
              background: { colors: [], material_blur: "ultra_thin" },
            },
            alt_text: caption,
            overlay_id: "caption:standard",
            overlay_type: "caption",
          },
        ]
      : [],
    sent_to_self_only: privatePost,
    sent_to_all: !privatePost,
    update_streak_for_yyyymmdd: streakDayStamp(),
  };

  if (input.recipients?.length) {
    data.recipients = input.recipients;
  }

  if (caption) {
    data.caption = caption;
  }

  const payload = await locketPost(session, "postMomentV2", { data });
  const result = asRecord(asRecord(payload)?.result);
  const created = asRecord(result?.data) ?? result;
  const id =
    asString(created?.id) ??
    asString(created?.moment_uid) ??
    asString(created?.canonical_uid) ??
    randomUUID();

  return { id, imageUrl };
}

/** `reactToMoment` — adds an emoji reaction on a friend's moment. */
export async function reactToLocketMoment(
  session: LocketSession,
  input: { momentId: string; ownerUid: string; emoji: string },
): Promise<void> {
  await locketPost(session, "reactToMoment", {
    data: {
      intensity: 1,
      moment_uid: input.momentId,
      reaction: input.emoji,
      owner_uid: input.ownerUid,
    },
  });
}
