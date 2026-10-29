import { describe, expect, it } from "vitest";
import { completionTimestamp, isOverdue, startOfWeek } from "@/server/services/task-rules";

const now = new Date("2026-10-29T12:00:00Z"); // a Thursday

describe("completionTimestamp", () => {
  it("stamps the time when a task becomes done", () => {
    expect(completionTimestamp({ status: "todo", completedAt: null }, "done", now)).toEqual(now);
  });

  it("clears it when a done task is reopened", () => {
    expect(completionTimestamp({ status: "done", completedAt: now }, "in_progress", now)).toBeNull();
  });

  it("keeps the original stamp when status doesn't change", () => {
    const earlier = new Date("2026-10-01T00:00:00Z");
    expect(completionTimestamp({ status: "done", completedAt: earlier }, "done", now)).toEqual(earlier);
    expect(completionTimestamp({ status: "done", completedAt: earlier }, undefined, now)).toEqual(earlier);
  });
});

describe("isOverdue", () => {
  it("is true only for open tasks due before today", () => {
    expect(isOverdue({ status: "todo", dueDate: new Date("2026-10-28T00:00:00Z") }, now)).toBe(true);
    expect(isOverdue({ status: "todo", dueDate: new Date("2026-10-29T00:00:00Z") }, now)).toBe(false);
    expect(isOverdue({ status: "done", dueDate: new Date("2026-10-01T00:00:00Z") }, now)).toBe(false);
    expect(isOverdue({ status: "todo", dueDate: null }, now)).toBe(false);
  });
});

describe("startOfWeek", () => {
  it("returns Monday 00:00 UTC", () => {
    expect(startOfWeek(now).toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(startOfWeek(new Date("2026-11-01T23:59:00Z")).toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});
