import { readUpload } from "@/lib/media";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name } = await params;
  const image = await readUpload(name);

  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Blob([image.data], { type: image.contentType }), {
    headers: {
      "content-type": image.contentType,
      "content-length": String(image.data.byteLength),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
