import { describe, expect, it } from "vitest";
import { clientIp, createMemoryStore, createRateLimiter } from "@/server/rate-limit";

describe("rate limiter (memory store)", () => {
  it("allows up to the limit, then rejects with Retry-After info", async () => {
    let now = 0;
    const limiter = createRateLimiter(createMemoryStore(), () => now);
    const rule = { limit: 3, windowSeconds: 10 };
    for (let i = 0; i < 3; i++) expect((await limiter.check("k", rule)).allowed).toBe(true);
    const blocked = await limiter.check("k", rule);
    expect(blocked).toMatchObject({ allowed: false, remaining: 0, resetAt: 10_000 });

    now = 4_000;
    await expect(limiter.enforce("k", rule)).rejects.toMatchObject({ status: 429, details: { retryAfterSeconds: 6 } });
  });

  it("starts a new window after it expires and keeps keys independent", async () => {
    let now = 0;
    const limiter = createRateLimiter(createMemoryStore(), () => now);
    const rule = { limit: 1, windowSeconds: 1 };
    await limiter.check("a", rule);
    expect((await limiter.check("b", rule)).allowed).toBe(true);
    expect((await limiter.check("a", rule)).allowed).toBe(false);
    now = 1_000;
    expect((await limiter.check("a", rule)).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first X-Forwarded-For hop", () => {
    const request = new Request("http://x", { headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" } });
    expect(clientIp(request)).toBe("198.51.100.1");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
