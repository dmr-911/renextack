import { ArrowLeft, ListTodo } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectActions } from "@/features/projects/components/project-actions";
import { TaskForm } from "@/features/tasks/components/task-form";
import { TaskRow } from "@/features/tasks/components/task-row";
import { taskListQuerySchema } from "@/features/tasks/schema";
import { formatDate } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { projectPolicy } from "@/server/authz/permissions";
import { isAppError } from "@/server/http/errors";
import { getProject } from "@/server/services/projects";
import { isOverdue } from "@/server/services/task-rules";
import { listTasks } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Project" };

export default function ProjectPage(props: PageProps<"/dashboard/projects/[projectId]">) {
  return (
    <div className="grid gap-6">
      <Link href="/dashboard/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All projects
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProjectDetail {...props} />
      </Suspense>
    </div>
  );
}

async function ProjectDetail({ params, searchParams }: PageProps<"/dashboard/projects/[projectId]">) {
  const { projectId } = await params;
  const viewer = await requireViewer(`/dashboard/projects/${projectId}`);
  const rawStatus = (await searchParams).status;
  const rawPage = (await searchParams).page;
  const query = taskListQuerySchema.safeParse({
    status: typeof rawStatus === "string" && rawStatus ? rawStatus : undefined,
    page: typeof rawPage === "string" ? rawPage : undefined,
    pageSize: 50,
  });
  const taskQuery = query.success ? query.data : taskListQuerySchema.parse({ pageSize: 50 });

  const project = await getProject(viewer, projectId).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const tasks = await listTasks(viewer, project.id, taskQuery);
  const canEdit = projectPolicy.canEdit(viewer, project);
  const canDelete = projectPolicy.canDelete(viewer, project);
  const now = new Date();

  const filters = [
    { value: undefined, label: "All" },
    { value: "todo", label: "To do" },
    { value: "in_progress", label: "In progress" },
    { value: "done", label: "Done" },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant={project.status === "active" ? "success" : "neutral"}>{project.status === "active" ? "Active" : "Archived"}</Badge>
          </div>
          {project.description ? <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p> : null}
          <p className="text-xs text-muted-foreground">
            {project.openTaskCount} open of {project.taskCount} tasks · created {formatDate(project.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProjectActions
            project={{ id: project.id, name: project.name, description: project.description, status: project.status }}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>
      </div>

      {!canEdit ? (
        <Alert variant="info" title="Read-only">
          You’re viewing another user’s project as an administrator. Only the owner can change it.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Open tasks are listed first, highest priority on top.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {canEdit && project.status === "active" ? <TaskForm projectId={project.id} /> : null}
          {canEdit && project.status === "archived" ? (
            <Alert variant="warning">This project is archived. Restore it to add tasks.</Alert>
          ) : null}

          <nav aria-label="Filter tasks by status" className="flex flex-wrap gap-1">
            {filters.map((filter) => {
              const active = taskQuery.status === filter.value;
              return (
                <Link
                  key={filter.label}
                  href={filter.value ? `?status=${filter.value}` : "?"}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      : "rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                  }
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>

          {tasks.data.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title={taskQuery.status ? "No tasks with this status" : "No tasks yet"}
              description={canEdit && !taskQuery.status ? "Add your first task above." : undefined}
            />
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border" aria-label="Tasks">
              {tasks.data.map((item) => (
                <TaskRow
                  key={`${item.id}-${item.status}-${item.updatedAt.getTime()}`}
                  editable={canEdit}
                  task={{
                    id: item.id,
                    title: item.title,
                    status: item.status,
                    priority: item.priority,
                    dueDate: item.dueDate ? formatDate(item.dueDate) : null,
                    overdue: isOverdue(item, now),
                  }}
                />
              ))}
            </ul>
          )}
          {tasks.pagination.totalPages > 1 ? (
            <Pagination
              page={tasks.pagination.page}
              totalPages={tasks.pagination.totalPages}
              total={tasks.pagination.total}
              basePath={`/dashboard/projects/${project.id}`}
              searchParams={{ status: taskQuery.status }}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
