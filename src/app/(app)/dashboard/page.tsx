import { Activity as ActivityIcon, AlertTriangle, CheckCircle2, FolderKanban, ListTodo } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { formatRelative } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { getDashboardOverview } from "@/server/cache/dashboard";
import { DashboardSkeleton } from "./dashboard-skeleton";

export const metadata: Metadata = { title: "Overview" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const viewer = await requireViewer("/dashboard");
  const [overview, params] = await Promise.all([getDashboardOverview(viewer), searchParams]);
  const now = new Date();

  const stats = [
    { label: "Active projects", value: overview.activeProjects, icon: FolderKanban, href: "/dashboard/projects?status=active" },
    { label: "Open tasks", value: overview.openTasks, icon: ListTodo },
    { label: "Completed this week", value: overview.completedThisWeek, icon: CheckCircle2 },
    { label: "Overdue", value: overview.overdueTasks, icon: AlertTriangle, tone: overview.overdueTasks > 0 ? "warning" : undefined },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Hi, ${viewer.name.split(" ")[0]}`}
        description="Here's what's happening across your projects."
        actions={
          <Link href="/dashboard/projects?new=1" className={buttonClasses()}>
            New project
          </Link>
        }
      />
      {params.welcome ? (
        <Alert variant="success" title="Your account is ready">
          Create your first project to get started.
        </Alert>
      ) : null}

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <stat.icon
                className={stat.tone === "warning" ? "h-4 w-4 text-warning" : "h-4 w-4 text-muted-foreground"}
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums" data-testid={`stat-${stat.label.toLowerCase().replaceAll(" ", "-")}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Cached per user and refreshed whenever you change something. Computed {formatRelative(overview.generatedAt, now)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentActivity.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activity yet"
              description="Create a project or add a task and it will show up here."
              action={
                <Link href="/dashboard/projects?new=1" className={buttonClasses({ variant: "outline", size: "sm" })}>
                  Create a project
                </Link>
              }
            />
          ) : (
            <ol className="grid gap-3" aria-label="Recent activity">
              {overview.recentActivity.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
                  <span>
                    {item.projectId ? (
                      <Link href={`/dashboard/projects/${item.projectId}`} className="hover:underline">
                        {item.summary}
                      </Link>
                    ) : (
                      item.summary
                    )}
                  </span>
                  <time dateTime={new Date(item.createdAt).toISOString()} className="shrink-0 text-muted-foreground">
                    {formatRelative(item.createdAt, now)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
