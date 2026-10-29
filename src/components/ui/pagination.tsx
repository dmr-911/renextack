import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "./button";

/**
 * Link-based pagination: works without JavaScript, is shareable, and keeps
 * every other query parameter (filters, search) intact.
 */
export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) if (value && key !== "page") params.set(key, value);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {total} {total === 1 ? "result" : "results"}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={buttonClasses({ variant: "outline", size: "sm" })} rel="prev">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </Link>
        ) : (
          <span className={buttonClasses({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })} aria-disabled="true">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </span>
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={buttonClasses({ variant: "outline", size: "sm" })} rel="next">
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className={buttonClasses({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })} aria-disabled="true">
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
