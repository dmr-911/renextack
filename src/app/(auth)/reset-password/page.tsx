import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="You'll be signed out of all other devices.">
      <Suspense fallback={<Skeleton className="h-40" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
