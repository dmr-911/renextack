export interface StoredObject {
  key: string;
  size: number;
  contentType: string;
}

/**
 * Minimal object storage contract. Implement it for S3, R2, GCS, or a
 * provider's SDK; the rest of the app only depends on this interface.
 */
export interface StorageProvider {
  readonly name: string;
  put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  delete(key: string): Promise<void>;
}
