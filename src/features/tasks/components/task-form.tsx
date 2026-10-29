"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import type { ActionState } from "@/lib/action-state";
import { createTaskAction } from "@/features/projects/actions";

export function TaskForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createTaskAction.bind(null, projectId), { status: "idle" } as ActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3" aria-label="Add task">
      {state.status === "error" && !fieldErrors ? <Alert variant="error">{state.message}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem_10rem_auto] sm:items-end">
        <Field label="Task" error={fieldErrors?.title}>
          <Input ref={titleRef} name="title" required maxLength={200} placeholder="What needs doing?" />
        </Field>
        <Field label="Priority" error={fieldErrors?.priority}>
          <Select name="priority" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Due date" error={fieldErrors?.dueDate}>
          <Input name="dueDate" type="date" />
        </Field>
        <Button type="submit" loading={pending}>
          Add task
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {state.status === "success" ? state.message : ""}
      </p>
    </form>
  );
}
