import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("allows same-site relative paths", () => {
    expect(safeRedirectPath("/dashboard/projects?status=active")).toBe("/dashboard/projects?status=active");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "dashboard"])(
    "rejects %s",
    (target) => {
      expect(safeRedirectPath(target)).toBe("/dashboard");
    },
  );

  it("falls back when empty", () => {
    expect(safeRedirectPath(null, "/home")).toBe("/home");
  });
});
