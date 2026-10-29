import { ShieldAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RoleSelect } from "@/features/admin/components/role-select";
import { userListQuerySchema } from "@/features/admin/schema";
import { formatDate } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { hasPermission } from "@/server/authz/permissions";
import { listUsers } from "@/server/services/users";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage({ searchParams }: PageProps<"/dashboard/admin/users">) {
  return (
    <div className="grid gap-6">
      <PageHeader title="Users" description="Everyone with an account. Visible to administrators only." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <UserDirectory searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function UserDirectory({ searchParams }: { searchParams: PageProps<"/dashboard/admin/users">["searchParams"] }) {
  const viewer = await requireViewer("/dashboard/admin/users");
  // Server-side check: hiding the nav link is not access control.
  if (!hasPermission(viewer, "user:list")) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Administrators only"
        description="You don't have permission to view this page. Ask an administrator if you need access."
      />
    );
  }

  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value || undefined]),
  );
  const parsed = userListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : userListQuerySchema.parse({});
  const result = await listUsers(viewer, query);

  return (
    <div className="grid gap-4">
      <form role="search" aria-label="Filter users" className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={query.q} placeholder="Search name or email" aria-label="Search users" className="flex-1" />
        <Select name="role" defaultValue={query.role ?? ""} aria-label="Role" className="sm:w-36">
          <option value="">Any role</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>
      {result.data.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <>
          <Table caption="Users">
            <THead>
              <tr>
                <TH>Name</TH>
                <TH className="hidden md:table-cell">Email</TH>
                <TH>Role</TH>
                <TH className="hidden sm:table-cell">Joined</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <span className="font-medium">{row.name}</span>
                    {row.id === viewer.id ? <Badge className="ml-2">You</Badge> : null}
                    <span className="block text-xs text-muted-foreground md:hidden">{row.email}</span>
                  </TD>
                  <TD className="hidden md:table-cell">{row.email}</TD>
                  <TD>
                    <RoleSelect userId={row.id} name={row.name} role={row.role} disabled={row.id === viewer.id} />
                  </TD>
                  <TD className="hidden text-muted-foreground sm:table-cell">{formatDate(row.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            total={result.pagination.total}
            basePath="/dashboard/admin/users"
            searchParams={{ q: query.q, role: query.role }}
          />
        </>
      )}
    </div>
  );
}
