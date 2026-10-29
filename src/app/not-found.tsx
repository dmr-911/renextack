import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">The page you’re looking for doesn’t exist or you don’t have access to it.</p>
      <Link href="/" className={buttonClasses({ variant: "outline" })}>
        Go home
      </Link>
    </main>
  );
}
