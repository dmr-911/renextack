import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="4" />
          <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2" strokeLinecap="round" />
        </svg>
      </span>
      {siteConfig.name}
    </Link>
  );
}
