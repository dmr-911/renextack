import { FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { NewProjectDialog } from "@/features/projects/components/new-project-dialog";
import { ProjectFilters } from "@/features/projects/components/project-filters";
import { projectListQuerySchema } from "@/features/projects/schema";
import { formatRelative } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { hasPermission } from "@/server/authz/permissions";
import { listProjects } from "@/server/services/projects";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage({ searchParams }: PageProps<"/dashboard/projects">) {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Projects"
        description="Everything you're working on."
        actions={
          <Suspense fallback={null}>
            <NewProjectDialog />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProjectList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProjectList({ searchParams }: { searchParams: PageProps<"/dashboard/projects">["searchParams"] }) {
  const viewer = await requireViewer("/dashboard/projects");
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;
  // Invalid filter values fall back to defaults instead of erroring.
  const parsed = projectListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : projectListQuerySchema.parse({});
  const canSeeAll = hasPermission(viewer, "project:list:all");
  const result = await listProjects(viewer, canSeeAll ? query : { ...query, scope: "mine" });
  const filtered = Boolean(query.q || query.status);
  const now = new Date();

  return (
    <div className="grid gap-4">
      {raw.deleted ? <Alert variant="success">Project deleted.</Alert> : null}
      <ProjectFilters q={query.q} status={query.status} sort={query.sort} scope={query.scope} showScope={canSeeAll} />
      {result.data.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No matching projects"
            description="Try a different search or clear the filters."
            action={
              <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">
                Clear filters
              </Link>
            }
          />
        ) : (
          <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to start tracking tasks." />
        )
      ) : (
        <>
          <Table caption="Projects">
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH className="text-right">Open tasks</TH>
                <TH className="hidden sm:table-cell">Updated</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <Link href={`/dashboard/projects/${item.id}`} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                    {item.ownerId !== viewer.id ? <span className="ml-2 text-xs text-muted-foreground">(another user)</span> : null}
                    {item.description ? <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p> : null}
                  </TD>
                  <TD>
                    <Badge variant={item.status === "active" ? "success" : "neutral"}>{item.status === "active" ? "Active" : "Archived"}</Badge>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {item.openTaskCount}
                    <span className="text-muted-foreground"> / {item.taskCount}</span>
                  </TD>
                  <TD className="hidden text-muted-foreground sm:table-cell">{formatRelative(item.updatedAt, now)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            total={result.pagination.total}
            basePath="/dashboard/projects"
            searchParams={{ q: query.q, status: query.status, sort: query.sort === "updated" ? undefined : query.sort, scope: query.scope === "mine" ? undefined : query.scope }}
          />
        </>
      )}
    </div>
  );
}
