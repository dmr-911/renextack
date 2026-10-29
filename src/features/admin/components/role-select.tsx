"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { updateUserRoleAction } from "../actions";

export function RoleSelect({ userId, name, role, disabled }: { userId: string; name: string; role: "user" | "admin"; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  return (
    <div className="grid gap-1">
      <Select
        aria-label={`Role for ${name}`}
        defaultValue={role}
        disabled={disabled || pending}
        className="h-8 w-28 text-xs"
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            const result = await updateUserRoleAction(userId, next);
            setMessage(result.status === "error" ? { error: true, text: result.message } : { error: false, text: "Saved" });
          });
        }}
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </Select>
      <span aria-live="polite" className={message?.error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {message?.text}
      </span>
    </div>
  );
}
