"use server";

import { requireViewer } from "@/server/auth/viewer";
import { runAction } from "@/server/http/action";
import { parseOrThrow } from "@/server/http/validation";
import { updateUserRole } from "@/server/services/users";
import { roleUpdateSchema } from "./schema";
import { revalidatePath } from "next/cache";

export async function updateUserRoleAction(userId: string, role: string) {
  return runAction(async () => {
    const viewer = await requireViewer();
    const input = parseOrThrow(roleUpdateSchema, { role });
    const updated = await updateUserRole(viewer, userId, input.role);
    revalidatePath("/dashboard/admin/users");
    return { status: "success", message: `${updated.name} is now ${updated.role === "admin" ? "an admin" : "a user"}` };
  });
}
