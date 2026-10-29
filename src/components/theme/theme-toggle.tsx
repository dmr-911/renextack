"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { THEME_STORAGE_KEY } from "./theme-script";

type Theme = "light" | "dark" | "system";

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const subscribe = () => () => {};

export function ThemeToggle() {
  // `mounted` avoids rendering a stale icon during hydration.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [theme, setTheme] = useState<Theme>(() => (typeof window === "undefined" ? "system" : readTheme()));

  useEffect(() => {
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this page view.
    }
    apply(next);
  };

  const Icon = !mounted || theme === "system" ? Laptop : theme === "dark" ? Moon : Sun;
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change color theme">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} className="z-50 min-w-36 rounded-md border border-border bg-surface p-1 shadow-md">
          <Menu.RadioGroup value={theme} onValueChange={(value) => choose(value as Theme)}>
            {options.map((option) => (
              <Menu.RadioItem
                key={option.value}
                value={option.value}
                className={cn(
                  "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted",
                  "data-[state=checked]:font-medium",
                )}
              >
                <option.icon className="h-4 w-4" aria-hidden="true" />
                {option.label}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
