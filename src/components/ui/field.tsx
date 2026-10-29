import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium leading-none", className)} {...props} />;
}

interface FieldProps {
  label: string;
  /** The form control. Field wires up id, aria-invalid, and aria-describedby on it. */
  children: ReactElement<Record<string, unknown>>;
  hint?: ReactNode;
  error?: string | string[];
  className?: string;
  id?: string;
}

/** Label + control + hint + error message, with the accessibility attributes connected. */
export function Field({ label, children, hint, error, className, id }: FieldProps) {
  const generated = useId();
  const controlId = id ?? (children.props.id as string | undefined) ?? generated;
  const message = Array.isArray(error) ? error[0] : error;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = message ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={controlId}>{label}</Label>
      {isValidElement(children)
        ? cloneElement(children, {
            id: controlId,
            "aria-invalid": message ? true : undefined,
            "aria-describedby": describedBy,
          })
        : children}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
