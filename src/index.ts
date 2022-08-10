import type { Change, SetOptions, Store, Stored, Unsubscribe } from "./types";

const now = () => Date.now();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Safe JSON.parse with undefined fallback */
function safeParse<T>(raw: string | null): Stored<T> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Stored<T>;
  } catch {
    return undefined;
  }
}

/** In-memory fallback for SSR / non-browser environments */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => {
      m.delete(k);
    },
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
  } as Storage;
}

type Emitter = {
  on(fn: (c: Change) => void): Unsubscribe;
  emit(c: Change): void;
};

function createEmitter(): Emitter {
  const fns = new Set<(c: Change) => void>();
  return {
    on(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    emit(c) {
      fns.forEach((fn) => fn(c));
    },
  };
}

function make(store: Storage | null): Store {
  const backing = store ?? memoryStorage();
  const emitter = createEmitter();

  // Wire cross-tab 'storage' events (browser only, and only when using real Storage)
  if (isBrowser() && store) {
    window.addEventListener("storage", (e: StorageEvent) => {
      if (e.storageArea !== store) return;
      if (e.key === null) {
        emitter.emit({ type: "clear" });
      } else if (e.newValue === null) {
        emitter.emit({ type: "remove", key: e.key });
      } else {
        emitter.emit({ type: "set", key: e.key });
      }
    });
  }

  const api: Store = {
    set<T>(key: string, value: T, opts?: SetOptions) {
      const payload: Stored<T> = opts?.ttl
        ? { v: value, e: now() + opts.ttl }
        : { v: value };
      try {
        backing.setItem(key, JSON.stringify(payload));
        emitter.emit({ type: "set", key });
      } catch {
        // Quota exceeded or serialization error
      }
    },

    get<T>(key: string): T | undefined {
      const parsed = safeParse<T>(backing.getItem(key));
      if (!parsed) return undefined;
      if (parsed.e && now() > parsed.e) {
        // expire lazily
        try {
          backing.removeItem(key);
        } catch {}
        emitter.emit({ type: "remove", key });
        return undefined;
      }
      return parsed.v as T;
    },

    remove(key: string) {
      try {
        backing.removeItem(key);
      } finally {
        emitter.emit({ type: "remove", key });
      }
    },

    clear() {
      try {
        backing.clear();
      } finally {
        emitter.emit({ type: "clear" });
      }
    },

    has(key: string): boolean {
      return this.get(key) !== undefined;
    },

    keys(): string[] {
      const ks: string[] = [];
      for (let i = 0; i < backing.length; i++) {
        const k = backing.key(i);
        if (!k) continue;
        // Filter out expired on the fly
        if (this.has(k)) ks.push(k);
      }
      return ks;
    },

    subscribe(fn: (ev: Change) => void): Unsubscribe {
      return emitter.on(fn);
    },
  };

  return api;
}

/** Namespaced helpers (optional): create a store wrapper with a prefix */
export function withPrefix(store: Store, prefix: string): Store {
  const p = (k: string) => `${prefix}:${k}`;
  return {
    set: (k, v, o) => store.set(p(k), v, o),
    get: (k) => store.get(p(k)),
    remove: (k) => store.remove(p(k)),
    clear: () => {
      // best-effort: remove only prefixed keys
      for (const k of store.keys())
        if (k.startsWith(`${prefix}:`)) store.remove(k);
    },
    has: (k) => store.has(p(k)),
    keys: () =>
      store
        .keys()
        .filter((k) => k.startsWith(`${prefix}:`))
        .map((k) => k.slice(prefix.length + 1)),
    subscribe: (fn) =>
      store.subscribe((ev) => {
        if (ev.type === "clear") return fn(ev); // may include non-prefixed keys
        if ("key" in ev && ev.key.startsWith(`${prefix}:`)) {
          const key = ev.key.slice(prefix.length + 1);
          fn(
            ev.type === "set" ? { type: "set", key } : { type: "remove", key }
          );
        }
      }),
  };
}

/** Ready-made instances */
const local: Store = make(isBrowser() ? window.localStorage : null);
const session: Store = make(isBrowser() ? window.sessionStorage : null);

export type { Store, SetOptions, Change, Unsubscribe } from "./types";
export default { local, session, withPrefix };
