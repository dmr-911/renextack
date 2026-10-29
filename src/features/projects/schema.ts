import { z } from "zod";
import { paginationSchema } from "@/server/http/pagination";

/** Validation shared by forms (client), Server Actions, and API routes (server). */

export const PROJECT_STATUSES = ["active", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(120, "Name must be 120 characters or fewer");
const description = z.string().trim().max(2000, "Description must be 2000 characters or fewer");

export const projectInputSchema = z.object({
  name,
  description: description.default(""),
});

export const projectUpdateSchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Provide at least one field to update",
  });

export const projectListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  sort: z.enum(["updated", "created", "name"]).default("updated"),
  /** `all` lists every user's projects and requires the admin role. */
  scope: z.enum(["mine", "all"]).default("mine"),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
