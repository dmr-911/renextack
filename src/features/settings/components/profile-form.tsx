"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!nextName || nextName.length > 100) {
      setStatus({ kind: "error", message: "Name must be between 1 and 100 characters." });
      return;
    }
    setStatus({ kind: "saving" });
    const { error } = await authClient.updateUser({ name: nextName });
    if (error) {
      setStatus({ kind: "error", message: error.message ?? "Could not save your profile." });
      return;
    }
    setStatus({ kind: "saved", message: "Profile updated." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {status.kind === "error" ? <Alert variant="error">{status.message}</Alert> : null}
      {status.kind === "saved" ? <Alert variant="success">{status.message}</Alert> : null}
      <Field label="Name">
        <Input name="name" defaultValue={name} autoComplete="name" required maxLength={100} />
      </Field>
      <Field label="Email" hint="Changing your email isn't enabled in this starter. See docs/adding-a-feature.md.">
        <Input name="email" defaultValue={email} disabled />
      </Field>
      <div>
        <Button type="submit" loading={status.kind === "saving"}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
