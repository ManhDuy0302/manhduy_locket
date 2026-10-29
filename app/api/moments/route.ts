import { getDb, nowIso } from "@/lib/db";
import { randomUUID } from "node:crypto";

import { getCurrentUser } from "@/lib/auth";
import { postImageToLocket } from "@/lib/locket/api";
import { getLocketSession, locketErrorMessage } from "@/lib/locket/client";
import { getLocketAccount } from "@/lib/locket/store";
import { storeImage } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "You need to log in again." }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "We couldn't read that photo." }, { status: 400 });
  }

  const photo = formData.get("photo");

  if (!(photo instanceof File)) {
    return Response.json({ error: "Add a photo first." }, { status: 400 });
  }

  const stored = await storeImage(photo);

  if ("error" in stored) {
    return Response.json({ error: stored.error }, { status: 400 });
  }

  const id = randomUUID();
  const createdAt = nowIso();

  getDb()
    .prepare("insert into moments (id, user_id, file, created_at) values (?, ?, ?, ?)")
    .run(id, user.id, stored.file, createdAt);

  // Optional mirror to the real Locket account. A failure there never loses the
  // local copy, it is reported back so the camera can say what happened.
  let locket: { ok: boolean; id?: string; error?: string } | null = null;

  if (formData.get("toLocket") === "1" && getLocketAccount(user.id)) {
    try {
      const session = await getLocketSession(user.id);
      const bytes = new Uint8Array(await photo.arrayBuffer());
      const posted = await postImageToLocket(session, {
        data: bytes,
        contentType: photo.type || "image/jpeg",
        audience: "friends",
      });

      locket = { ok: true, id: posted.id };
    } catch (error) {
      locket = { ok: false, error: locketErrorMessage(error) };
    }
  }

  return Response.json({ id, createdAt, locket });
}
