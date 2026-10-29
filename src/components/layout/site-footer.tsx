import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {siteConfig.name} is a demo app built with LaunchStack Next.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/components" className="hover:text-foreground">
            Components
          </Link>
          <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-foreground">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}
