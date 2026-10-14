import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Config } from "../../config";

export interface MediaFile {
  /** Relative path, e.g. "services/korean-glow-facial/3f2a9c1b-640.webp". */
  path: string;
  body: Buffer;
  contentType: string;
}

export interface MediaStorage {
  put(files: MediaFile[]): Promise<void>;
  remove(paths: string[]): Promise<void>;
}

/** Development: files in MEDIA_DIR, served by the API at /media (app.ts). */
class LocalMediaStorage implements MediaStorage {
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

/** Production: S3 behind CloudFront (plan C16). Names are content hashes, so files never change. */
class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;

  constructor(
    region: string,
    private readonly bucket: string,
  ) {
    this.client = new S3Client({ region });
  }

  async put(files: MediaFile[]): Promise<void> {
    for (const file of files) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: file.path,
          Body: file.body,
          ContentType: file.contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    }
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: paths.map((Key) => ({ Key })) } }));
  }
}

export const localMediaDir = (config: Config): string => resolve(config.MEDIA_DIR);

export function createMediaStorage(config: Config): MediaStorage {
  if (config.MEDIA_STORAGE === "s3" && config.S3_MEDIA_BUCKET) return new S3MediaStorage(config.AWS_REGION, config.S3_MEDIA_BUCKET);
  return new LocalMediaStorage(localMediaDir(config));
}
