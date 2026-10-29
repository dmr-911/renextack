import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="gap-1.5 p-6 pb-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-6 pt-0">{children}</CardContent>
      {footer ? <CardFooter className="justify-center px-6 py-4 text-sm text-muted-foreground">{footer}</CardFooter> : null}
    </Card>
  );
}
