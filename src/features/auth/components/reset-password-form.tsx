"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "../schema";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [pending, setPending] = useState(false);

  if (!token || linkError) {
    return (
      <div className="grid gap-4">
        <Alert variant="error" title="This link is invalid or has expired">
          Reset links work once and expire after an hour.
        </Alert>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as "password" | "confirm"] ??= issue.message;
      setErrors(next);
      return;
    }
    setPending(true);
    setErrors({});
    const { error } = await authClient.resetPassword({ newPassword: parsed.data.password, token: token! });
    if (error) {
      setPending(false);
      setErrors({ form: error.message ?? "Could not reset your password. Request a new link." });
      return;
    }
    router.replace("/sign-in?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
      <Field label="New password" error={errors.password} hint="At least 10 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Confirm new password" error={errors.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" loading={pending}>
        Set new password
      </Button>
    </form>
  );
}
