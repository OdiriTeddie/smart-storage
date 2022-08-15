# smart-storage

> Tiny, SSR-safe local/session storage with JSON, TTL, and subscriptions.

---

## ✨ Features

- ✅ **SSR-safe** — gracefully falls back to in-memory storage on the server
- 🕒 **TTL support** — store values with automatic expiration
- 🧱 **Typed API** — written in TypeScript
- 🧩 **Subscriptions** — listen to changes (works cross-tab via `storage` events)
- 🌲 **Tree-shakable** — `sideEffects: false`

---

## 📦 Install

```bash
npm install smart-storage
# or
yarn add smart-storage

```

🚀 Quick start
import { local, session, withPrefix } from "smart-storage";

// Store with TTL (1 minute)
local.set("user", { id: 1, name: "Ada" }, { ttl: 60_000 });

// Read (undefined if missing/expired)
const user = local.get<{ id: number; name: string }>("user");

// Remove / clear
local.remove("user");
local.clear();

🔑 API

Both local and session stores implement:

set<T>(key: string, value: T, opts?: { ttl?: number }): void
get<T>(key: string): T | undefined
remove(key: string): void
clear(): void
has(key: string): boolean
keys(): string[]
subscribe(fn: (ev: { type: "set"|"remove"; key: string } | { type: "clear" }) => void): () => void

Namespacing
const appStore = withPrefix(local, "myapp");

appStore.set("theme", "dark");
console.log(appStore.keys()); // ["theme"]

🔔 Subscriptions
Listen for changes (works across tabs if using localStorage):

const unsubscribe = local.subscribe((ev) => {
if (ev.type === "clear") console.log("cleared");
else console.log(ev.type, ev.key);
});

// later
unsubscribe();

⚠️ Notes

Values are JSON-serialized → store only serializable data.

Expiration is lazy: expired keys are removed when read.

If storage quota is exceeded, writes fail silently.

🛠 Development

Clone and build locally:

git clone https://github.com/yourname/smart-storage.git
cd smart-storage
npm install
npm run build
npm test
