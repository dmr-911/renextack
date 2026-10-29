import { Activity, Check, FolderKanban, LockKeyhole, Moon, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

const features = [
  { icon: FolderKanban, title: "Projects and tasks", body: "Organise work into projects, track tasks by status, priority, and due date." },
  { icon: Activity, title: "Activity feed", body: "See what changed and when, so nothing slips through the cracks." },
  { icon: Users, title: "Roles", body: "Regular users manage their own work. Admins get a user directory and support access." },
  { icon: LockKeyhole, title: "Secure accounts", body: "Email and password sign-in, password reset, and session management." },
  { icon: ShieldCheck, title: "Private by default", body: "Every request is checked on the server. You only ever see your own data." },
  { icon: Moon, title: "Light and dark", body: "Follows your system preference, or pick a theme yourself." },
];

const plans = [
  { name: "Free", price: "$0", blurb: "For individuals getting organised.", perks: ["Up to 3 active projects", "Unlimited tasks", "Activity feed"] },
  { name: "Pro", price: "$12", blurb: "For small teams shipping every week.", perks: ["Unlimited projects", "Priority support", "Everything in Free"], featured: true },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="mx-auto rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          Example app · built with LaunchStack Next
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{siteConfig.tagline}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {siteConfig.name} keeps projects, tasks, and progress in one calm place. Sign up in seconds, no credit card
          required.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
            Start for free
          </Link>
          <Link href="/sign-in" className={buttonClasses({ size: "lg", variant: "outline" })}>
            Sign in
          </Link>
        </div>
      </section>

      <section id="features" aria-labelledby="features-heading" className="border-t border-border bg-surface/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="features-heading" className="text-center text-3xl font-semibold tracking-tight">
            Everything a small team needs
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle className="mt-2">{feature.title}</CardTitle>
                  <CardDescription>{feature.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" aria-labelledby="pricing-heading" className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <h2 id="pricing-heading" className="text-center text-3xl font-semibold tracking-tight">
            Simple pricing
          </h2>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Illustrative plans. Billing is an optional integration; see docs/integrations.md.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.featured ? "border-primary ring-1 ring-primary" : undefined}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-3xl font-semibold">
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground"> / month</span>
                  </p>
                  <CardDescription>{plan.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <ul className="grid gap-2 text-sm">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" aria-hidden="true" /> {perk}
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up" className={buttonClasses({ variant: plan.featured ? "primary" : "outline" })}>
                    Choose {plan.name}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
