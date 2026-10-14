"use client";

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";

type Result = { ok: true; message: string } | { ok: false; fieldErrors: Record<string, string> };
type Toast = { text: string; error: boolean };

// The forms re-mount with fresh values after each save, so the "Saved" message lives up here
const ToastContext = createContext<(toast: Toast) => void>(() => {});

export function ContentToasts({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={setToast}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <Icon name={toast.error ? "info" : "check"} />
          <span>{toast.text}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// Shared by the Website content forms: runs a save and keeps its field errors
export function useSave() {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast({ text: result.message, error: false });
      else {
        setErrors(result.fieldErrors);
        // A problem with the whole form (not one field) is said in the message itself
        const { form, ...fields } = result.fieldErrors;
        const text = form && Object.keys(fields).length === 0 ? form : "Not saved: check the highlighted fields.";
        toast({ text, error: true });
      }
    });

  const error = (name: string) =>
    errors[name] && (
      <small className="field-error" role="alert">
        {errors[name]}
      </small>
    );

  return { pending, errors, run, error };
}

export function SaveBar({ save, label }: { save: ReturnType<typeof useSave>; label: string }) {
  return (
    <div className="editor-actions">
      <button type="submit" className="btn btn-primary" disabled={save.pending}>
        {save.pending ? "Saving…" : label}
      </button>
    </div>
  );
}
