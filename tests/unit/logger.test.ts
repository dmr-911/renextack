import { describe, expect, it } from "vitest";
import { redact } from "@/server/logger";

describe("log redaction", () => {
  it("masks secret-looking keys at any depth", () => {
    expect(
      redact({ email: "a@b.co", password: "hunter2", nested: { apiKey: "k", authorization: "Bearer x", ok: 1 }, list: [{ token: "t" }] }),
    ).toEqual({
      email: "a@b.co",
      password: "[redacted]",
      nested: { apiKey: "[redacted]", authorization: "[redacted]", ok: 1 },
      list: [{ token: "[redacted]" }],
    });
  });

  it("serializes errors to plain objects", () => {
    const result = redact(new Error("boom")) as { message: string; name: string };
    expect(result).toMatchObject({ name: "Error", message: "boom" });
  });
});
