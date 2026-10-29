"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Catches unexpected rendering errors outside the dashboard. The digest links to server logs. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-8">
      <Alert variant="error" title="Something went wrong">
        An unexpected error occurred.{error.digest ? ` Reference: ${error.digest}` : ""}
      </Alert>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </main>
  );
}
