export type SetOptions = { ttl?: number }; // milliseconds

export type Stored<T> = {
  v: T; // value
  e?: number; // expiry epoch ms
};

export type Change =
  | { type: "set"; key: string }
  | { type: "remove"; key: string }
  | { type: "clear" };

export type Unsubscribe = () => void;

export interface Store {
  /** Write JSON-serializable value with optional TTL. */
  set<T>(key: string, value: T, opts?: SetOptions): void;

  /** Read value, returns undefined if missing/expired/invalid. */
  get<T>(key: string): T | undefined;

  /** Remove key. */
  remove(key: string): void;

  /** Clear store. */
  clear(): void;

  /** Does a (non-expired) key exist? */
  has(key: string): boolean;

  /** List non-expired keys (best-effort). */
  keys(): string[];

  /** Subscribe to local + cross-tab changes. */
  subscribe(fn: (ev: Change) => void): Unsubscribe;
}
