import { describe, it, expect, beforeEach } from "vitest";
import smart from "../src/index";

describe("smart-storage", () => {
  beforeEach(() => {
    smart.local.clear();
    smart.session.clear();
  });

  it("sets and gets values", () => {
    smart.local.set("user", { id: 1 });
    expect(smart.local.get<{ id: number }>("user")?.id).toBe(1);
  });

  it("respects TTL", async () => {
    smart.local.set("token", "abc", { ttl: 10 });
    expect(smart.local.get("token")).toBe("abc");
    await new Promise((r) => setTimeout(r, 15));
    expect(smart.local.get("token")).toBeUndefined();
  });

  it("has() reflects non-expired keys", async () => {
    smart.local.set("k", "v", { ttl: 5 });
    expect(smart.local.has("k")).toBe(true);
    await new Promise((r) => setTimeout(r, 8));
    expect(smart.local.has("k")).toBe(false);
  });

  it("keys() lists only non-expired keys", async () => {
    smart.local.set("a", 1);
    smart.local.set("b", 2, { ttl: 5 });
    expect(smart.local.keys().sort()).toEqual(["a", "b"]);
    await new Promise((r) => setTimeout(r, 8));
    expect(smart.local.keys()).toEqual(["a"]);
  });

  it("withPrefix isolates namespace", () => {
    const userStore = smart.withPrefix(smart.local, "user");
    userStore.set("theme", "dark");
    expect(userStore.get("theme")).toBe("dark");
    expect(smart.local.get("user:theme")).toBe("dark");
    // keys() for namespaced store strips prefix
    expect(userStore.keys()).toEqual(["theme"]);
  });

  it("subscribe receives local events", () => {
    const events: string[] = [];
    const unsub = smart.local.subscribe((e) => {
      if (e.type === "clear") events.push("clear");
      else events.push(`${e.type}:${e.key}`);
    });

    smart.local.set("x", 1);
    smart.local.remove("x");
    smart.local.clear();
    unsub();

    expect(events).toEqual(["set:x", "remove:x", "clear"]);
  });
});
