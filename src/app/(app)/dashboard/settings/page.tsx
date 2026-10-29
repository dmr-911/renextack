import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeButton } from "@/features/settings/components/billing-card";
import { DeleteAccount } from "@/features/settings/components/delete-account";
import { Alert } from "@/components/ui/alert";
import { paymentsEnabled } from "@/server/integrations/payments";
import { PasswordForm } from "@/features/settings/components/password-form";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { SessionsCard } from "@/features/settings/components/sessions-card";
import { describeUserAgent } from "@/features/settings/device";
import { getAuth } from "@/server/auth/auth";
import { requireViewer } from "@/server/auth/viewer";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage({ searchParams }: PageProps<"/dashboard/settings">) {
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Settings" description="Manage your profile, password, and sessions." />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Profile />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Changing your password signs you out everywhere else.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-24" />}>
            <Sessions />
          </Suspense>
        </CardContent>
      </Card>
      <Suspense fallback={null}>
        <Billing searchParams={searchParams} />
      </Suspense>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Permanently delete your account and all of its data.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}

async function Profile() {
  const viewer = await requireViewer("/dashboard/settings");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name is shown in the app and in emails.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm name={viewer.name} email={viewer.email} />
      </CardContent>
    </Card>
  );
}

async function Sessions() {
  await requireViewer("/dashboard/settings");
  const requestHeaders = await headers();
  const auth = getAuth();
  const [sessions, current] = await Promise.all([
    auth.api.listSessions({ headers: requestHeaders }),
    auth.api.getSession({ headers: requestHeaders }),
  ]);
  return (
    <SessionsCard
      sessions={sessions.map((session) => ({
        id: session.id,
        device: describeUserAgent(session.userAgent),
        createdAt: new Date(session.createdAt).toISOString(),
        current: session.id === current?.session.id,
      }))}
    />
  );
}

/** Shown only when PAYMENTS_PROVIDER=stripe. With billing off, the app has no paywall at all. */
async function Billing({ searchParams }: { searchParams: PageProps<"/dashboard/settings">["searchParams"] }) {
  await requireViewer("/dashboard/settings");
  if (!paymentsEnabled()) return null;
  const { billing } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Payments are processed by Stripe. You can cancel at any time.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {billing === "success" ? <Alert variant="success">Thanks! Your payment was received.</Alert> : null}
        {billing === "cancelled" ? <Alert>Checkout was cancelled. You haven&apos;t been charged.</Alert> : null}
        <UpgradeButton />
      </CardContent>
    </Card>
  );
}
