import { describe, expect, it } from "vitest";
import { escapeLike, paginate, paginationSchema, toOffset } from "@/server/http/pagination";

describe("pagination", () => {
  it("parses query strings with defaults and bounds", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationSchema.parse({ page: "3", pageSize: "50" })).toEqual({ page: 3, pageSize: 50 });
    expect(paginationSchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "abc" }).success).toBe(false);
  });

  it("computes limit and offset", () => {
    expect(toOffset({ page: 1, pageSize: 20 })).toEqual({ limit: 20, offset: 0 });
    expect(toOffset({ page: 4, pageSize: 10 })).toEqual({ limit: 10, offset: 30 });
  });

  it("builds the response envelope", () => {
    expect(paginate(["a"], 41, { page: 2, pageSize: 20 }).pagination).toEqual({ page: 2, pageSize: 20, total: 41, totalPages: 3 });
    expect(paginate([], 0, { page: 1, pageSize: 20 }).pagination.totalPages).toBe(1);
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("100%_done\\")).toBe("100\\%\\_done\\\\");
    expect(escapeLike("plain")).toBe("plain");
  });
});
