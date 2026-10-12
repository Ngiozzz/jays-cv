import type { ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  required?: boolean;
  full?: boolean;
  hidden?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

// One labelled field in the preview's form style, with its error message underneath
export function FormField({ id, label, required, full, hidden, error, hint, children }: Props) {
  const className = ["f", full ? "full" : "", error ? "invalid" : ""].filter(Boolean).join(" ");
  return (
    <div className={className} hidden={hidden}>
      <label htmlFor={id}>
        {label} {required && <em>*</em>}
      </label>
      {children}
      {hint && <small>{hint}</small>}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
