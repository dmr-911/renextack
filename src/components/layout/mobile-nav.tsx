"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Slide-over navigation for small screens. Focus-trapped, closes on Escape and on navigation. */
export function MobileNav({
  items,
  label,
  footer,
}: {
  items: readonly { href: string; label: string }[];
  label: string;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={`Open ${label.toLowerCase()}`}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 border-l border-border bg-surface p-5 shadow-xl md:hidden"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">{label}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <MobileNavLinks items={items} label={label} onNavigate={() => setOpen(false)} />
          {footer ? <div className="mt-auto">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Only mounted while the dialog is open, so reading the pathname never blocks prerendering. */
function MobileNavLinks({
  items,
  label,
  onNavigate,
}: {
  items: readonly { href: string; label: string }[];
  label: string;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="grid gap-1">
      {items.map((item) => {
        const active = item.href === pathname;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
