import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const styles = {
  info: { className: "border-primary/30 bg-accent text-accent-foreground", Icon: Info },
  success: { className: "border-success/40 bg-success/10 text-foreground", Icon: CheckCircle2 },
  warning: { className: "border-warning/50 bg-warning/10 text-foreground", Icon: TriangleAlert },
  error: { className: "border-destructive/40 bg-destructive/10 text-foreground", Icon: AlertCircle },
} as const;

interface AlertProps {
  variant?: keyof typeof styles;
  title?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Inline status message. Errors use role="alert" (announced immediately);
 * other variants use role="status" (announced politely).
 */
export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const { className: variantClass, Icon } = styles[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border p-3 text-sm", variantClass, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="grid gap-0.5">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-sm opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
