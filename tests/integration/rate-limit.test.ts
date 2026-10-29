import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createDatabaseStore, createRateLimiter } from "@/server/rate-limit";

describe("database rate limit store", () => {
  it("counts atomically under concurrency and resets after the window", async () => {
    let now = 1_000_000;
    const limiter = createRateLimiter(createDatabaseStore(db), () => now);
    const key = `test:${crypto.randomUUID()}`;
    const rule = { limit: 5, windowSeconds: 60 };

    const results = await Promise.all(Array.from({ length: 8 }, () => limiter.check(key, rule)));
    expect(results.filter((result) => result.allowed)).toHaveLength(5);

    await expect(limiter.enforce(key, rule)).rejects.toMatchObject({ code: "rate_limited", status: 429 });

    now += 61_000;
    expect((await limiter.check(key, rule)).allowed).toBe(true);
  });
});
