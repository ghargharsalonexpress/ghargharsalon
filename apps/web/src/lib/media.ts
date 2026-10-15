import { type ImageRef, isSitePhoto, isUploadedVideo, type MediaMode, mediaUrl } from "@brand/shared";

/** Where catalogue photos live: the API's /media in development, ImageKit in production. */
export const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_URL ?? "http://localhost:4000/media").replace(/\/$/, "");

/**
 * "files" asks for a stored file per size; "imagekit" asks the CDN to resize one original.
 * It follows the API's MEDIA_STORAGE, so the two must be set together.
 */
export const MEDIA_MODE: MediaMode = import.meta.env.VITE_MEDIA_MODE === "imagekit" ? "imagekit" : "files";

/** One WebP URL of an image at about `width` px (video posters, link previews). */
export function imageSrc(image: ImageRef, width: number): string {
  const shipped = isSitePhoto(image);
  const size = image.widths.find((candidate) => candidate >= width) ?? image.widths.at(-1) ?? image.width;
  return mediaUrl(shipped ? "" : MEDIA_BASE_URL, image, size, "webp", shipped ? "files" : MEDIA_MODE);
}

/** The address of a website video: an upload (a media key), a file shipped with the site, or a link. */
export const videoSrc = (value: string): string => (isUploadedVideo(value) ? `${MEDIA_BASE_URL}/${value}` : value);
