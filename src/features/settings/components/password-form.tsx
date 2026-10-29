"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { passwordSchema } from "@/features/auth/schema";

export function PasswordForm() {
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = passwordSchema.safeParse(data.get("newPassword"));
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message });
      return;
    }
    setStatus({ kind: "saving" });
    const { error } = await authClient.changePassword({
      currentPassword: String(data.get("currentPassword")),
      newPassword: parsed.data,
      revokeOtherSessions: true,
    });
    if (error) {
      setStatus({ kind: "error", message: error.message ?? "Could not change your password." });
      return;
    }
    form.reset();
    setStatus({ kind: "saved", message: "Password changed. Other devices have been signed out." });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {status.kind === "error" ? <Alert variant="error">{status.message}</Alert> : null}
      {status.kind === "saved" ? <Alert variant="success">{status.message}</Alert> : null}
      <Field label="Current password">
        <Input name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" hint="At least 10 characters.">
        <Input name="newPassword" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <div>
        <Button type="submit" loading={status.kind === "saving"}>
          Change password
        </Button>
      </div>
    </form>
  );
}
