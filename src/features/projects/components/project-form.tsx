"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { ActionState } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Create/edit form shared by the "New project" modal and the project settings card. */
export function ProjectForm({
  action,
  defaults,
  submitLabel,
}: {
  action: Action;
  defaults?: { name: string; description: string };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      {state.status === "error" && !fieldErrors ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === "success" && state.message ? <Alert variant="success">{state.message}</Alert> : null}
      <Field label="Name" error={fieldErrors?.name}>
        <Input name="name" defaultValue={defaults?.name} required maxLength={120} placeholder="e.g. Website relaunch" />
      </Field>
      <Field label="Description" error={fieldErrors?.description} hint="Optional. Up to 2000 characters.">
        <Textarea name="description" defaultValue={defaults?.description} maxLength={2000} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
