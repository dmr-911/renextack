"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Error boundary for every dashboard page. The sidebar and header stay usable. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid max-w-lg gap-4">
      <Alert variant="error" title="This page couldn't be loaded">
        Something went wrong on our side.{error.digest ? ` Reference: ${error.digest}` : ""}
      </Alert>
      <div>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
