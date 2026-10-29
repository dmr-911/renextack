"use client";

import { FolderKanban, Home, Settings, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const icons: Record<string, LucideIcon> = { home: Home, folder: FolderKanban, settings: Settings, users: Users };

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar navigation with the current page highlighted. Reading the pathname
 * makes this dynamic, so render it inside <Suspense> with <AppNavFallback>
 * (same links, no highlight) as the prerendered fallback.
 */
export function AppNav({ items, label }: { items: readonly NavItem[]; label: string }) {
  return <NavList items={items} label={label} pathname={usePathname()} />;
}

export function AppNavFallback({ items, label }: { items: readonly NavItem[]; label: string }) {
  return <NavList items={items} label={label} pathname={null} />;
}

function NavList({ items, label, pathname }: { items: readonly NavItem[]; label: string; pathname: string | null }) {
  return (
    <nav aria-label={label} className="grid gap-0.5">
      {items.map((item) => {
        const Icon = icons[item.icon] ?? Home;
        const active = pathname !== null && isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
