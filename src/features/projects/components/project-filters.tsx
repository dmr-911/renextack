import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

/** Plain GET form: filtering works without JavaScript and every result is a shareable URL. */
export function ProjectFilters({ q, status, sort, scope, showScope }: { q?: string; status?: string; sort?: string; scope?: string; showScope: boolean }) {
  return (
    <form role="search" aria-label="Filter projects" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input name="q" defaultValue={q} placeholder="Search projects" aria-label="Search projects" className="pl-9" />
      </div>
      <Select name="status" defaultValue={status ?? ""} aria-label="Status" className="sm:w-36">
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </Select>
      <Select name="sort" defaultValue={sort ?? "updated"} aria-label="Sort by" className="sm:w-40">
        <option value="updated">Recently updated</option>
        <option value="created">Newest</option>
        <option value="name">Name</option>
      </Select>
      {showScope ? (
        <Select name="scope" defaultValue={scope ?? "mine"} aria-label="Owner" className="sm:w-36">
          <option value="mine">My projects</option>
          <option value="all">All users</option>
        </Select>
      ) : null}
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
