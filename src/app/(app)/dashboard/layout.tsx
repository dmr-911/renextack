import { Suspense } from "react";
import { AppNav, AppNavFallback } from "@/components/layout/app-nav";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";
import { isAdmin } from "@/server/authz/permissions";
import { getViewer } from "@/server/auth/viewer";

/**
 * Authenticated app shell. The frame (sidebar, header) is static and
 * prerendered; only the parts that depend on who is signed in stream in
 * behind <Suspense>. Pages enforce authentication themselves with
 * `requireViewer()`; the layout never acts as the security boundary.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface px-3 py-5 md:flex">
        <div className="px-3">
          <Logo href="/dashboard" />
        </div>
        <Suspense fallback={<AppNavFallback items={siteConfig.nav.app} label="App" />}>
          <AppNav items={siteConfig.nav.app} label="App" />
        </Suspense>
        <Suspense fallback={null}>
          <AdminNav />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Suspense fallback={<MobileNav items={siteConfig.nav.app} label="App menu" />}>
              <MobileMenu />
            </Suspense>
            <Logo href="/dashboard" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
              <HeaderUser />
            </Suspense>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

async function HeaderUser() {
  const viewer = await getViewer();
  if (!viewer) return null;
  return <UserMenu name={viewer.name} email={viewer.email} />;
}

async function AdminNav() {
  const viewer = await getViewer();
  if (!isAdmin(viewer)) return null;
  return (
    <div className="grid gap-1">
      <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
      <AppNav items={siteConfig.nav.admin} label="Admin" />
    </div>
  );
}

async function MobileMenu() {
  const viewer = await getViewer();
  const items = isAdmin(viewer) ? [...siteConfig.nav.app, ...siteConfig.nav.admin] : siteConfig.nav.app;
  return <MobileNav items={items} label="App menu" />;
}
