import { describe, expect, it, vi } from "vitest";
import { createResendEmailProvider } from "@/server/integrations/email/resend-provider";
import { escapeHtml, passwordResetEmail } from "@/server/integrations/email/templates";

describe("email templates", () => {
  it("escapes user-controlled values in HTML", () => {
    const message = passwordResetEmail({ to: "a@b.co", name: "<script>alert(1)</script>", url: "https://app.test/r?a=1&b=2" });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("https://app.test/r?a=1&amp;b=2");
    expect(message.text).toContain("https://app.test/r?a=1&b=2");
  });

  it("escapes quotes", () => {
    expect(escapeHtml(`"'`)).toBe("&quot;&#39;");
  });
});

describe("Resend provider", () => {
  it("posts the message to the Resend API", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const provider = createResendEmailProvider({ apiKey: "re_test", from: "App <a@b.co>", fetchImpl: fetchImpl as typeof fetch });
    await provider.send({ to: "x@y.co", subject: "Hi", text: "Body" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string)).toMatchObject({ from: "App <a@b.co>", to: ["x@y.co"], subject: "Hi" });
  });

  it("throws a descriptive error when Resend rejects the request", async () => {
    const fetchImpl = vi.fn(async () => new Response("invalid from", { status: 422 }));
    const provider = createResendEmailProvider({ apiKey: "re_test", from: "bad", fetchImpl: fetchImpl as typeof fetch });
    await expect(provider.send({ to: "x@y.co", subject: "Hi", text: "Body" })).rejects.toThrow(/HTTP 422/);
  });
});
