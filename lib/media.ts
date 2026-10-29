import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { UPLOAD_DIR } from "./db";

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

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(/* turbopackIgnore: true */ UPLOAD_DIR, name), buffer);

  return { file: name };
}

export async function readUpload(
  name: string,
): Promise<{ data: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  if (!SAFE_FILE_NAME.test(name)) {
    return null;
  }

  try {
    const file = await readFile(join(/* turbopackIgnore: true */ UPLOAD_DIR, name));
    const data = new Uint8Array(file.byteLength);
    data.set(file);

    const extension = name.split(".").pop() ?? "jpg";

    return {
      data,
      contentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function deleteUpload(name: string | null): Promise<void> {
  if (!name || !SAFE_FILE_NAME.test(name)) {
    return;
  }

  try {
    await unlink(join(/* turbopackIgnore: true */ UPLOAD_DIR, name));
  } catch {
    // The file is already gone, nothing to clean up.
  }
}
