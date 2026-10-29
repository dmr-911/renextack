"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireViewer } from "@/server/auth/viewer";
import { invalidateDashboardFromAction } from "@/server/cache/dashboard";
import { runAction, type ActionState } from "@/server/http/action";
import { getAnalytics } from "@/server/integrations/analytics";
import { parseOrThrow } from "@/server/http/validation";
import { createProject, deleteProject, updateProject } from "@/server/services/projects";
import { createTask, deleteTask, updateTask } from "@/server/services/tasks";
import { taskInputSchema, taskUpdateSchema } from "../tasks/schema";
import { projectInputSchema, projectUpdateSchema } from "./schema";

/**
 * Server Actions for the projects UI. Each one re-authenticates (never trusts
 * the client), validates with the shared Zod schema, calls the service (which
 * enforces ownership), then invalidates the affected cache tag.
 */

export async function createProjectAction(_prev: ActionState, formData: FormData) {
  return runAction(async () => {
    const viewer = await requireViewer();
    const input = parseOrThrow(projectInputSchema, Object.fromEntries(formData));
    const created = await createProject(viewer, input);
    invalidateDashboardFromAction(viewer.id);
    // Runs after the response is sent, so a slow analytics provider never delays the user.
    after(() => getAnalytics().track({ name: "project_created", distinctId: viewer.id, properties: { source: "app" } }));
    redirect(`/dashboard/projects/${created.id}`);
  });
}

export async function updateProjectAction(projectId: string, _prev: ActionState, formData: FormData) {
  return runAction(async () => {
    const viewer = await requireViewer();
    const input = parseOrThrow(projectUpdateSchema, Object.fromEntries(formData));
    const updated = await updateProject(viewer, projectId, input);
    invalidateDashboardFromAction(updated.ownerId);
    return { status: "success", message: "Project saved" };
  });
}

export async function setProjectStatusAction(projectId: string, status: "active" | "archived") {
  return runAction(async () => {
    const viewer = await requireViewer();
    const updated = await updateProject(viewer, projectId, { status });
    invalidateDashboardFromAction(updated.ownerId);
    return { status: "success", message: status === "archived" ? "Project archived" : "Project restored" };
  });
}

export async function deleteProjectAction(projectId: string) {
  const result = await runAction(async () => {
    const viewer = await requireViewer();
    const deleted = await deleteProject(viewer, projectId);
    invalidateDashboardFromAction(deleted.ownerId);
    return { status: "success" };
  });
  if (result.status === "success") redirect("/dashboard/projects?deleted=1");
  return result;
}

export async function createTaskAction(projectId: string, _prev: ActionState, formData: FormData) {
  return runAction(async () => {
    const viewer = await requireViewer();
    const input = parseOrThrow(taskInputSchema, Object.fromEntries(formData));
    await createTask(viewer, projectId, input);
    invalidateDashboardFromAction(viewer.id);
    return { status: "success", message: "Task added" };
  });
}

export async function updateTaskAction(taskId: string, patch: Record<string, unknown>) {
  return runAction(async () => {
    const viewer = await requireViewer();
    const input = parseOrThrow(taskUpdateSchema, patch);
    await updateTask(viewer, taskId, input);
    invalidateDashboardFromAction(viewer.id);
    return { status: "success" };
  });
}

export async function deleteTaskAction(taskId: string) {
  return runAction(async () => {
    const viewer = await requireViewer();
    const deleted = await deleteTask(viewer, taskId);
    invalidateDashboardFromAction(deleted.ownerId);
    return { status: "success", message: "Task deleted" };
  });
}
