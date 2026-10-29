"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("pending");
    const { error } = await authClient.requestPasswordReset({
      email: String(new FormData(event.currentTarget).get("email")),
      redirectTo: "/reset-password",
    });
    if (error) {
      setStatus("error");
      setMessage(error.status === 429 ? "Too many requests. Try again in a few minutes." : "Could not send the email. Try again.");
      return;
    }
    // Same message whether or not the account exists, so emails can't be enumerated.
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <Alert variant="success" title="Check your inbox">
        If an account exists for that email, we’ve sent a link to reset your password. It expires in 1 hour.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {status === "error" && message ? <Alert variant="error">{message}</Alert> : null}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" loading={status === "pending"}>
        Send reset link
      </Button>
    </form>
  );
}
