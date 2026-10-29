"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Starts a Stripe Checkout session via the API and redirects to it. Only rendered when billing is enabled. */
export function UpgradeButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/v1/billing/checkout", { method: "POST" });
    const body = (await response.json().catch(() => null)) as { data?: { url: string }; error?: { message: string } } | null;
    if (!response.ok || !body?.data?.url) {
      setPending(false);
      setError(body?.error?.message ?? "Could not start checkout.");
      return;
    }
    window.location.assign(body.data.url);
  }

  return (
    <div className="grid gap-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div>
        <Button onClick={upgrade} loading={pending}>
          Upgrade to Pro
        </Button>
      </div>
    </div>
  );
}
