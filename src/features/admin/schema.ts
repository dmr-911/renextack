import { z } from "zod";
import { ROLES } from "@/server/authz/permissions";
import { paginationSchema } from "@/server/http/pagination";

export const userListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
});

export const roleUpdateSchema = z.object({ role: z.enum(ROLES) });

export type UserListQuery = z.infer<typeof userListQuerySchema>;
