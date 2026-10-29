import { randomUUID } from "node:crypto";

import { getDb, nowIso } from "./db";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const SAFE_FILE_NAME = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type ImageKind = { extension: "jpg" | "png" | "webp" };

function detectImage(buffer: Uint8Array): ImageKind | null {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg" };
  }

  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { extension: "png" };
  }

  if (
    buffer.length > 12 &&
    String.fromCharCode(...buffer.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...buffer.subarray(8, 12)) === "WEBP"
  ) {
    return { extension: "webp" };
  }

  return null;
}

/**
 * Photos live in Postgres (`media` table) so the app can run on hosts without a
 * writable disk. Each file keeps its `uuid.ext` name, which makes the media
 * route and the delete path unchanged.
 */
export async function storeImage(
  file: File,
): Promise<{ file: string } | { error: string }> {
  if (file.size === 0) {
    return { error: "The photo is empty. Try taking it again." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That photo is too large. Please pick a smaller one." };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const kind = detectImage(buffer);

  if (!kind) {
    return { error: "Only JPEG, PNG or WEBP photos are supported." };
  }

  const name = `${randomUUID()}.${kind.extension}`;
  const contentType = CONTENT_TYPES[kind.extension] ?? "application/octet-stream";

  await getDb()
    .prepare("insert into media (id, content_type, bytes, data, created_at) values (?, ?, ?, ?, ?)")
    .run(name, contentType, buffer.byteLength, Buffer.from(buffer), nowIso());

  return { file: name };
}

export async function readUpload(
  name: string,
): Promise<{ data: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  if (!SAFE_FILE_NAME.test(name)) {
    return null;
  }

  const row = (await getDb()
    .prepare("select data, content_type from media where id = ?")
    .get(name)) as { data: Buffer; content_type: string } | undefined;

  if (!row) {
    return null;
  }

  const source = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as unknown as string);
  const data = new Uint8Array(source.byteLength);
  data.set(source);

  return { data, contentType: row.content_type };
}

export async function deleteUpload(name: string | null): Promise<void> {
  if (!name || !SAFE_FILE_NAME.test(name)) {
    return;
  }

  await getDb().prepare("delete from media where id = ?").run(name);
}
