import { z } from "zod";
import { paginationSchema } from "@/server/http/pagination";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const title = z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or fewer");

/**
 * Accepts `YYYY-MM-DD` or a full ISO timestamp. `""` and `null` clear the date;
 * `undefined` means "not provided" so partial updates leave it unchanged.
 */
const dueDate = z
  .union([z.iso.date(), z.iso.datetime({ offset: true }), z.literal("")], {
    message: "Enter a valid date (YYYY-MM-DD)",
  })
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value ? new Date(value) : null));

export const taskInputSchema = z.object({
  title,
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  dueDate,
});

export const taskUpdateSchema = z
  .object({
    title: title.optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Provide at least one field to update",
  });

export const taskListQuerySchema = paginationSchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
