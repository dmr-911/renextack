"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signUpSchema } from "../schema";

type FieldErrors = Partial<Record<keyof z.infer<typeof signUpSchema>, string>>;

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof FieldErrors] ??= issue.message;
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setError(null);
    setPending(true);
    const { error: signUpError } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (signUpError) {
      setPending(false);
      setError(
        signUpError.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : (signUpError.message ?? "Could not create your account"),
      );
      return;
    }
    router.replace("/dashboard?welcome=1");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Field label="Name" error={fieldErrors.name}>
        <Input name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" error={fieldErrors.email}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" error={fieldErrors.password} hint="At least 10 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" loading={pending}>
        Create account
      </Button>
    </form>
  );
}
