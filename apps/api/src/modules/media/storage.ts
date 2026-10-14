import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { Config } from "../../config";

export interface MediaFile {
  /** Relative path, e.g. "services/korean-glow-facial/3f2a9c1b-640.webp". */
  path: string;
  body: Buffer;
  contentType: string;
}

export interface MediaStorage {
  /**
   * True when the CDN resizes and re-encodes on request, so one original is enough.
   * False when every size has to be written at upload time.
   */
  readonly transforms: boolean;
  put(files: MediaFile[]): Promise<void>;
  remove(paths: string[]): Promise<void>;
}

/** Development: files in MEDIA_DIR, served by the API at /media (app.ts). */
class LocalMediaStorage implements MediaStorage {
  readonly transforms = false;

  constructor(private readonly dir: string) {}

  async put(files: MediaFile[]): Promise<void> {
    for (const file of files) {
      const target = join(this.dir, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.body);
    }
  }

  async remove(paths: string[]): Promise<void> {
    await Promise.all(paths.map((path) => rm(join(this.dir, path), { force: true })));
  }
}

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const API_URL = "https://api.imagekit.io/v1/files";

/**
 * Production: ImageKit stores one original and builds every size and format from the URL
 * (see mediaUrl in @brand/shared). Names are content hashes, so a file never changes and
 * the same photo uploaded twice is stored once.
 */
class ImageKitMediaStorage implements MediaStorage {
  readonly transforms = true;
  private readonly auth: string;

  constructor(privateKey: string) {
    // ImageKit authenticates with the private key as the Basic username and no password.
    this.auth = `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
  }

  private async call(url: string, init: RequestInit): Promise<Response> {
    const response = await fetch(url, { ...init, headers: { Authorization: this.auth, ...init.headers } });
    if (!response.ok) {
      throw new Error(`ImageKit ${init.method ?? "GET"} ${new URL(url).pathname} failed: ${response.status} ${await response.text().catch(() => "")}`.trim());
    }
    return response;
  }

  async put(files: MediaFile[]): Promise<void> {
    for (const file of files) {
      const slash = file.path.lastIndexOf("/");
      const form = new FormData();
      form.set("file", new Blob([new Uint8Array(file.body)], { type: file.contentType }), file.path.slice(slash + 1));
      form.set("fileName", file.path.slice(slash + 1));
      form.set("folder", slash === -1 ? "/" : `/${file.path.slice(0, slash)}`);
      // The name is already a content hash: keep it exactly, and let a repeat upload overwrite.
      form.set("useUniqueFileName", "false");
      form.set("overwriteFile", "true");
      await this.call(UPLOAD_URL, { method: "POST", body: form });
    }
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    // Deletion is by id, so the paths have to be looked up first.
    const query = `filePath IN [${paths.map((path) => JSON.stringify(`/${path}`)).join(",")}]`;
    const found = (await (await this.call(`${API_URL}?searchQuery=${encodeURIComponent(query)}`, { method: "GET" })).json()) as Array<{ fileId: string }>;
    const fileIds = found.map((file) => file.fileId);
    if (fileIds.length === 0) return;
    await this.call(`${API_URL}/batch/deleteByFileIds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds }),
    });
  }
}

export const localMediaDir = (config: Config): string => resolve(config.MEDIA_DIR);

export function createMediaStorage(config: Config): MediaStorage {
  if (config.MEDIA_STORAGE === "imagekit" && config.IMAGEKIT_PRIVATE_KEY) return new ImageKitMediaStorage(config.IMAGEKIT_PRIVATE_KEY);
  return new LocalMediaStorage(localMediaDir(config));
}
