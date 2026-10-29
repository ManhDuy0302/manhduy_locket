const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1440;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> decoder for browsers without EXIF support.
    }
  }

  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/**
 * Crops any photo to Locket's portrait 3:4 frame and re-encodes it as JPEG so
 * uploads stay small on mobile networks.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  const source = await loadBitmap(file);
  const width = source.width;
  const height = source.height;

  if (!width || !height) {
    throw new Error("That photo couldn't be read.");
  }

  let sourceWidth = width;
  let sourceHeight = height;

  if (width / height > TARGET_RATIO) {
    sourceWidth = height * TARGET_RATIO;
  } else {
    sourceHeight = width / TARGET_RATIO;
  }

  const sourceX = (width - sourceWidth) / 2;
  const sourceY = (height - sourceHeight) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser can't process photos.");
  }

  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    TARGET_WIDTH,
    TARGET_HEIGHT,
  );

  if ("close" in source) {
    source.close();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("We couldn't prepare that photo."));
        }
      },
      "image/jpeg",
      0.9,
    );
  });
}
