import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
          {siteConfig.nav.marketing.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/sign-in" className={buttonClasses({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonClasses({ size: "sm" })}>
            Get started
          </Link>
          <MobileNav
            items={[...siteConfig.nav.marketing, { href: "/sign-in", label: "Sign in" }]}
            label="Main menu"
          />
        </div>
      </div>
    </header>
  );
}
