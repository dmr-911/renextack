"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { authClient } from "@/lib/auth-client";

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const { error: deleteError } = await authClient.deleteUser({
      password: String(new FormData(event.currentTarget).get("password")),
    });
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message ?? "Could not delete your account.");
      return;
    }
    router.replace("/?account-deleted=1");
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Delete your account?"
      description="All of your projects, tasks, and activity will be permanently deleted. This can't be undone."
      trigger={<Button variant="destructive">Delete account</Button>}
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label="Confirm with your password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" loading={busy}>
            Permanently delete
          </Button>
        </div>
      </form>
    </Modal>
  );
}
