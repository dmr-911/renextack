import { describe, expect, it } from "vitest";
import { signUpSchema } from "@/features/auth/schema";
import { projectInputSchema, projectListQuerySchema, projectUpdateSchema } from "@/features/projects/schema";
import { taskInputSchema, taskUpdateSchema } from "@/features/tasks/schema";

describe("project schemas", () => {
  it("trims and defaults input", () => {
    expect(projectInputSchema.parse({ name: "  Launch  " })).toEqual({ name: "Launch", description: "" });
  });

  it("requires at least one field on update and doesn't invent defaults", () => {
    expect(projectUpdateSchema.safeParse({}).success).toBe(false);
    expect(projectUpdateSchema.parse({ name: "Renamed" })).toEqual({ name: "Renamed" });
  });

  it("validates list filters", () => {
    expect(projectListQuerySchema.parse({})).toMatchObject({ sort: "updated", scope: "mine", page: 1 });
    expect(projectListQuerySchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});

describe("task schemas", () => {
  it("parses due dates and treats empty strings as cleared", () => {
    expect(taskInputSchema.parse({ title: "A", dueDate: "2030-01-02" }).dueDate).toEqual(new Date("2030-01-02T00:00:00Z"));
    expect(taskInputSchema.parse({ title: "A", dueDate: "" }).dueDate).toBeNull();
    expect(taskInputSchema.safeParse({ title: "A", dueDate: "next tuesday" }).success).toBe(false);
  });

  it("leaves dueDate undefined on partial updates that don't mention it", () => {
    expect(taskUpdateSchema.parse({ status: "done" })).toEqual({ status: "done", dueDate: undefined });
  });
});

describe("sign-up schema", () => {
  it("enforces the password policy", () => {
    expect(signUpSchema.safeParse({ name: "A", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ name: "A", email: "a@b.co", password: "long-enough-pw" }).success).toBe(true);
  });
});
