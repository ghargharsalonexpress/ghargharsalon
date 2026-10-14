/** Where catalogue photos live: the API's /media in development, S3 + CloudFront in production. */
export const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_URL ?? "http://localhost:4000/media").replace(/\/$/, "");
