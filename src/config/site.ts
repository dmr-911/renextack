/**
 * Product-level settings that are safe to ship to the browser. Rename the
 * product, change navigation, or update links here; server secrets live in
 * src/server/config/env.ts instead.
 */
export const siteConfig = {
  name: "Orbit",
  tagline: "Lightweight project tracking for small teams",
  description:
    "Orbit is the example SaaS app that ships with LaunchStack Next: projects, tasks, an activity feed, and an admin area.",
  supportEmail: "support@example.com",
  nav: {
    marketing: [
      { href: "/#features", label: "Features" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/components", label: "Components" },
    ],
    app: [
      { href: "/dashboard", label: "Overview", icon: "home" },
      { href: "/dashboard/projects", label: "Projects", icon: "folder" },
      { href: "/dashboard/settings", label: "Settings", icon: "settings" },
    ],
    admin: [{ href: "/dashboard/admin/users", label: "Users", icon: "users" }],
  },
} as const;
