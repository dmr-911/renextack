import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider, StoredObject } from "./types";

const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,255}$/;

/** Validates a storage key and rejects anything that could escape the storage root. */
export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.split("/").some((part) => part === ".." || part === "." || part === "")) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

/**
 * Stores files on the local disk. Works for development and single-server
 * deployments with a persistent volume. Not suitable for serverless hosts,
 * whose filesystems are ephemeral: implement StorageProvider for S3/R2 there.
 */
export function createLocalStorage(root: string): StorageProvider {
  const base = path.resolve(root);
  const resolve = (key: string) => {
    assertSafeKey(key);
    const full = path.resolve(base, key);
    if (!full.startsWith(base + path.sep)) throw new Error("Storage key escapes the storage root");
    return full;
  };

  return {
    name: "local",
    async put(key, body, contentType): Promise<StoredObject> {
      const file = resolve(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
      await writeFile(`${file}.meta.json`, JSON.stringify({ contentType }));
      return { key, size: body.byteLength, contentType };
    },
    async get(key) {
      const file = resolve(key);
      try {
        const [body, meta] = await Promise.all([readFile(file), readFile(`${file}.meta.json`, "utf8")]);
        return { body: new Uint8Array(body), contentType: (JSON.parse(meta) as { contentType: string }).contentType };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      const file = resolve(key);
      await Promise.all([rm(file, { force: true }), rm(`${file}.meta.json`, { force: true })]);
    },
  };
}
