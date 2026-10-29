import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ShowcaseInteractive } from "./showcase-interactive";

export const metadata: Metadata = { title: "Components" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={title} className="grid gap-4">
      <h2 id={title} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Living reference for the UI kit in src/components/ui. Static, so it prerenders. */
export default function ComponentsPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
        <p className="text-muted-foreground">
          The building blocks in <code className="rounded bg-muted px-1 py-0.5 text-sm">src/components/ui</code>. Toggle the theme
          in the header to check both palettes, and try everything with the keyboard.
        </p>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Form controls">
        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <Field label="Project name" hint="Shown on your dashboard.">
              <Input placeholder="Website relaunch" />
            </Field>
            <Field label="Email" error="Enter a valid email address">
              <Input type="email" defaultValue="not-an-email" />
            </Field>
            <Field label="Priority">
              <Select defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Disabled">
              <Input disabled defaultValue="Read only" />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea placeholder="Anything worth remembering" />
            </Field>
          </CardContent>
        </Card>
      </Section>

      <Section title="Alerts">
        <div className="grid gap-3">
          <Alert title="Heads up">Informational message for the user.</Alert>
          <Alert variant="success" title="Saved">Your changes were saved.</Alert>
          <Alert variant="warning" title="Almost out of space">You&apos;ve used 90% of your storage.</Alert>
          <Alert variant="error" title="Payment failed">Check your card details and try again.</Alert>
        </div>
      </Section>

      <Section title="Badges, loading states">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Neutral</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Active</Badge>
          <Badge variant="warning">Due soon</Badge>
          <Badge variant="danger">Overdue</Badge>
          <Spinner />
          <Skeleton className="h-6 w-32" />
        </div>
      </Section>

      <Section title="Modal and dropdown menu">
        <ShowcaseInteractive />
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Cards group related content.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">Body content goes here.</CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
          <EmptyState icon={Inbox} title="Nothing here yet" description="Empty states explain what will appear and how to start." action={<Button size="sm">Create item</Button>} />
        </div>
      </Section>

      <Section title="Table">
        <Table caption="Example table">
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Status</TH>
              <TH className="text-right">Tasks</TH>
            </tr>
          </THead>
          <TBody>
            {[
              ["Website relaunch", "Active", 4],
              ["Customer onboarding", "Active", 2],
              ["Q1 planning", "Archived", 0],
            ].map(([name, status, count]) => (
              <TR key={String(name)}>
                <TD className="font-medium">{name}</TD>
                <TD>
                  <Badge variant={status === "Active" ? "success" : "neutral"}>{status}</Badge>
                </TD>
                <TD className="text-right tabular-nums">{count}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>
    </div>
  );
}
