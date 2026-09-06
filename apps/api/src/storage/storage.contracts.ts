/**
 * Storage provider contract.
 *
 * FICMS is storage-agnostic and degrades gracefully: if the configured storage
 * backend is unavailable, operations never throw (they fall back to a local
 * filesystem store). Providers are selected by STORAGE_PROVIDER (default
 * 'local' for zero-config local dev; 's3' for object-storage deployments).
 *
 * Keys are always prefixed with an organisation id so a single bucket can host
 * many tenants without accidental cross-tenant access. Downloads are gated by
 * the authenticated documents route so tenant permissions still apply.
 */
export interface StorageProvider {
  /** Persist a buffer at the given key. */
  put(key: string, body: Buffer, contentType: string): Promise<{ success: boolean; key: string }>;
  /** Return a short-lived signed URL to read the object (object-store backends). */
  getUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Read raw bytes for a key (used to stream through the auth-gated route). */
  read?(key: string): Promise<Buffer>;
  /** Delete an object (best-effort; never throws). */
  delete(key: string): Promise<void>;
  /** Human-readable backend id, e.g. 'local' | 's3'. */
  readonly id: string;
}
