import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { deleteUpload, storeImage } from "@/lib/media";

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
    return Response.json({ error: "Choose a photo first." }, { status: 400 });
  }

  const stored = await storeImage(photo);

  if ("error" in stored) {
    return Response.json({ error: stored.error }, { status: 400 });
  }

  const previous = user.avatarFile;

  getDb()
    .prepare("update users set avatar_file = ? where id = ?")
    .run(stored.file, user.id);

  await deleteUpload(previous);

  return Response.json({ file: stored.file });
}
