import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createAnthropicProvider } from "@/server/integrations/ai/anthropic-provider";
import { parseSuggestions, suggestTasks } from "@/server/integrations/ai/suggest-tasks";
import type { AiProvider } from "@/server/integrations/ai/types";
import { createAnalytics } from "@/server/integrations/analytics/providers";
import { createCheckoutSession, verifyStripeWebhook } from "@/server/integrations/payments/stripe";
import { assertSafeKey, createLocalStorage } from "@/server/integrations/storage/local-provider";
import { createLogger } from "@/server/logger";

describe("Stripe webhook verification", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
  const sign = (timestamp: number, body = payload) =>
    `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;

  it("accepts a correctly signed, fresh event", () => {
    expect(verifyStripeWebhook(payload, sign(1000), secret, { now: 1100 }).type).toBe("checkout.session.completed");
  });

  it("rejects tampered bodies, wrong secrets, stale timestamps, and missing headers", () => {
    expect(() => verifyStripeWebhook(payload.replace("evt_1", "evt_2"), sign(1000), secret, { now: 1000 })).toThrow(/does not match/);
    expect(() => verifyStripeWebhook(payload, sign(1000), "whsec_other", { now: 1000 })).toThrow(/does not match/);
    expect(() => verifyStripeWebhook(payload, sign(1000), secret, { now: 2000 })).toThrow(/tolerance/);
    expect(() => verifyStripeWebhook(payload, null, secret)).toThrow(/Missing/);
    expect(() => verifyStripeWebhook(payload, "garbage", secret)).toThrow(/Malformed/);
  });
});

describe("Stripe checkout", () => {
  it("creates a subscription checkout session tied to the user", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ id: "cs_test_1", url: "https://checkout.stripe.com/c/1" }));
    const session = await createCheckoutSession(
      "sk_test_1",
      { userId: "u1", email: "a@b.co", priceId: "price_1", successUrl: "https://app/s", cancelUrl: "https://app/c" },
      fetchImpl as typeof fetch,
    );
    expect(session.url).toBe("https://checkout.stripe.com/c/1");
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = new URLSearchParams(String(init.body));
    expect(body.get("mode")).toBe("subscription");
    expect(body.get("client_reference_id")).toBe("u1");
    expect(body.get("line_items[0][price]")).toBe("price_1");
  });

  it("surfaces Stripe's error message", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ error: { message: "No such price" } }, { status: 400 }));
    await expect(
      createCheckoutSession("sk_test_1", { userId: "u", email: "e", priceId: "p", successUrl: "s", cancelUrl: "c" }, fetchImpl as typeof fetch),
    ).rejects.toThrow(/No such price/);
  });
});

describe("local storage", () => {
  let root: string;
  afterAll(() => rm(root, { recursive: true, force: true }));

  it("round-trips files and returns null for missing keys", async () => {
    root = await mkdtemp(path.join(tmpdir(), "launchstack-storage-"));
    const storage = createLocalStorage(root);
    await storage.put("avatars/u1.png", new Uint8Array([1, 2, 3]), "image/png");
    expect(await storage.get("avatars/u1.png")).toEqual({ body: new Uint8Array([1, 2, 3]), contentType: "image/png" });
    await storage.delete("avatars/u1.png");
    expect(await storage.get("avatars/u1.png")).toBeNull();
  });

  it.each(["../etc/passwd", "a/../../b", "/abs", "a//b", ".hidden", "a/./b"])("rejects unsafe key %s", (key) => {
    expect(() => assertSafeKey(key)).toThrow();
  });
});

describe("analytics", () => {
  const log = createLogger();

  it("is a silent no-op by default", async () => {
    const analytics = createAnalytics({ provider: "none", log });
    await expect(analytics.track({ name: "x", distinctId: "u" })).resolves.toBeUndefined();
  });

  it("sends PostHog capture events and never throws on failure", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 200 }));
    const analytics = createAnalytics({ provider: "posthog", posthog: { apiKey: "phc_1", host: "https://ph.test/" }, log, fetchImpl: fetchImpl as typeof fetch });
    await analytics.track({ name: "project_created", distinctId: "u1", properties: { source: "app" } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://ph.test/i/v0/e/");
    expect(JSON.parse(String(init.body))).toMatchObject({ api_key: "phc_1", event: "project_created", distinct_id: "u1" });

    const failing = createAnalytics({ provider: "posthog", posthog: { apiKey: "k", host: "https://ph.test" }, log, fetchImpl: (async () => { throw new Error("down"); }) as typeof fetch });
    await expect(failing.track({ name: "x", distinctId: "u" })).resolves.toBeUndefined();
  });
});

describe("AI task suggestions", () => {
  const fake = (text: string, completed = true): AiProvider => ({ name: "fake", generateText: async () => ({ text, completed }) });

  it("parses a JSON list, even inside a code fence", async () => {
    expect(await suggestTasks(fake('```json\n["Write docs", "Ship beta"]\n```'), { name: "P", description: "", existingTasks: [] })).toEqual([
      "Write docs",
      "Ship beta",
    ]);
  });

  it("returns nothing for refusals or unparseable output", async () => {
    expect(await suggestTasks(fake("", false), { name: "P", description: "", existingTasks: [] })).toEqual([]);
    expect(parseSuggestions("Sure! Here are some ideas: write docs")).toEqual([]);
    expect(parseSuggestions('["", 5]')).toEqual([]);
  });

  it("calls the Anthropic SDK with the configured model and reports refusals", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ stop_reason: "end_turn", content: [{ type: "text", text: '["A"]' }] })
      .mockResolvedValueOnce({ stop_reason: "refusal", content: [] });
    const client = { beta: { messages: { create } } } as unknown as ConstructorParameters<typeof Object>[0];
    const provider = createAnthropicProvider({ apiKey: "k", model: "claude-opus-5-5", client: client as never });

    expect(await provider.generateText({ prompt: "hi", system: "sys" })).toEqual({ text: '["A"]', completed: true });
    expect(create.mock.calls[0]![0]).toMatchObject({ model: "claude-opus-5-5", system: "sys", fallbacks: "default" });
    expect(await provider.generateText({ prompt: "hi" })).toEqual({ text: "", completed: false });
  });
});
