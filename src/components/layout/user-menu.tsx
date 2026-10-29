"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const signOut = () =>
    startTransition(async () => {
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    });

  return (
    <DropdownMenu
      label="Account"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Account menu for ${name}`}
        >
          <Avatar name={name} />
        </button>
      }
    >
      <DropdownMenuLabel>
        <span className="block text-sm font-medium text-foreground">{name}</span>
        <span className="block truncate">{email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings">
          <Settings className="h-4 w-4" aria-hidden="true" /> Settings
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={signOut} disabled={pending}>
        <LogOut className="h-4 w-4" aria-hidden="true" /> {pending ? "Signing out…" : "Sign out"}
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
