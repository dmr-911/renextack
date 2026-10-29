import "server-only";
import { env } from "@/server/config/env";
import { errors } from "@/server/http/errors";
import { createLocalStorage } from "./local-provider";
import type { StorageProvider } from "./types";

export type { StorageProvider, StoredObject } from "./types";

let provider: StorageProvider | null | undefined;

export function getStorage(): StorageProvider | null {
  if (provider !== undefined) return provider;
  const config = env();
  provider = config.STORAGE_PROVIDER === "local" ? createLocalStorage(config.STORAGE_LOCAL_DIR) : null;
  return provider;
}

export function requireStorage(): StorageProvider {
  const configured = getStorage();
  if (!configured) throw errors.notConfigured("File storage");
  return configured;
}
