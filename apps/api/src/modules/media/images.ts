import { createHash } from "node:crypto";
import type { ImageRef } from "@brand/shared";
import sharp, { type Metadata } from "sharp";
import { AppError } from "../../errors";
import type { MediaFile } from "./storage";

/** srcset sizes (plan B6): cards use 320–640, heroes up to 1280. */
export const IMAGE_WIDTHS = [320, 640, 960, 1280] as const;
const MAX_INPUT_PIXELS = 60_000_000;

/**
 * Prepares an uploaded photo for storage, always stripping metadata (location, camera) by
 * re-encoding. File names are content hashes, so they can be cached forever and the same
 * photo uploaded twice is stored once.
 *
 * `transforms` (a CDN that resizes on request) keeps one full-size master and lets the CDN
 * make the sizes; otherwise every size is encoded here as AVIF and WebP.
 */
export async function processImage(input: Buffer, folder: string, { transforms = false }: { transforms?: boolean } = {}): Promise<{ image: ImageRef; files: MediaFile[] }> {
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch (error) {
    throw new AppError("VALIDATION_FAILED", { fields: { file: "validation.imageUnreadable" }, cause: error });
  }
  if (!metadata.width || !metadata.height || !["jpeg", "png", "webp", "avif", "heif"].includes(metadata.format ?? "")) {
    throw new AppError("VALIDATION_FAILED", { fields: { file: "validation.imageType" } });
  }

  // EXIF orientations 5–8 are rotated 90°, so width and height swap once auto-oriented.
  const rotated = (metadata.orientation ?? 1) >= 5;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;

  const hash = createHash("sha256").update(input).digest("hex").slice(0, 12);
  const key = `${folder.replace(/^\/|\/$/g, "")}/${hash}`;
  const widths = IMAGE_WIDTHS.filter((size) => size <= width);
  if (widths.length === 0) widths.push(width as (typeof IMAGE_WIDTHS)[number]);

  const files: MediaFile[] = [];

  if (transforms) {
    // One master, rotated and stripped; the CDN builds every size and format from it.
    const body = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate().webp({ quality: 90 }).toBuffer();
    files.push({ path: `${key}.webp`, body, contentType: "image/webp" });
    return { image: { key: `${key}.webp`, width, height, widths: [...widths] }, files };
  }

  for (const size of widths) {
    const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate().resize({ width: size, withoutEnlargement: true });
    files.push({ path: `${key}-${size}.webp`, body: await pipeline.clone().webp({ quality: 78 }).toBuffer(), contentType: "image/webp" });
    files.push({ path: `${key}-${size}.avif`, body: await pipeline.clone().avif({ quality: 52, effort: 4 }).toBuffer(), contentType: "image/avif" });
  }

  return { image: { key, width, height, widths: [...widths] }, files };
}

/**
 * Every stored file of an image, for deletion. A key with an extension is a single master
 * the CDN resizes; an extensionless one has a file per size and format.
 */
export const imageFiles = (image: ImageRef): string[] =>
  image.key.includes(".") ? [image.key] : image.widths.flatMap((size) => [`${image.key}-${size}.webp`, `${image.key}-${size}.avif`]);

/** What a video upload really is, from its first bytes (never the browser's say-so). */
export function videoKind(body: Buffer): { ext: "mp4" | "webm"; contentType: string } | null {
  // MP4 / QuickTime-family: a box size, then "ftyp".
  if (body.length >= 12 && body.toString("latin1", 4, 8) === "ftyp") return { ext: "mp4", contentType: "video/mp4" };
  // WebM / Matroska: the EBML header.
  if (body.length >= 4 && body[0] === 0x1a && body[1] === 0x45 && body[2] === 0xdf && body[3] === 0xa3) return { ext: "webm", contentType: "video/webm" };
  return null;
}

/**
 * A video for the website (ADR-0021), stored as uploaded: the admin's clip is already
 * encoded, and the file name is a content hash, so the same clip is stored once.
 */
export function prepareVideo(input: Buffer): { key: string; file: MediaFile } {
  const kind = videoKind(input);
  if (!kind) throw new AppError("VALIDATION_FAILED", { fields: { file: "validation.videoType" } });
  const hash = createHash("sha256").update(input).digest("hex").slice(0, 12);
  const key = `site/videos/${hash}.${kind.ext}`;
  return { key, file: { path: key, body: input, contentType: kind.contentType } };
}
