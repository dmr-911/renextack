"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { formatRelative } from "@/lib/format";

export interface SessionSummary {
  id: string;
  device: string;
  createdAt: string;
  current: boolean;
}

/** Sessions are loaded on the server (no tokens reach the browser); this component only revokes. */
export function SessionsCard({ sessions }: { sessions: SessionSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const revokeOthers = () =>
    startTransition(async () => {
      const { error } = await authClient.revokeOtherSessions();
      setMessage(error ? { kind: "error", text: "Could not sign out other sessions." } : { kind: "success", text: "Signed out of all other sessions." });
      router.refresh();
    });

  return (
    <div className="grid gap-4">
      {message ? <Alert variant={message.kind}>{message.text}</Alert> : null}
      <ul className="divide-y divide-border rounded-md border border-border" aria-label="Active sessions">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span>
              {session.device}
              {session.current ? <span className="ml-2 text-xs font-medium text-success">This device</span> : null}
            </span>
            <span className="text-muted-foreground">Signed in {formatRelative(session.createdAt)}</span>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="outline" onClick={revokeOthers} loading={pending} disabled={sessions.length <= 1}>
          Sign out other sessions
        </Button>
      </div>
    </div>
  );
}
