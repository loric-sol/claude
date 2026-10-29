"use client";

import { useFormStatus } from "react-dom";
import { createContext, useContext, useEffect, useState, useTransition, type FormHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import type { FormState } from "@/lib/form";
import { Check, Info } from "../icons";

const PendingContext = createContext(false);

/**
 * Form that submits to a useActionState dispatcher without React's automatic
 * form reset, so typed values survive validation errors.
 */
export function ActionForm({ action, children, ...rest }: Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & { action: (fd: FormData) => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={pending}>
      <form
        {...rest}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}

export function SubmitButton({ children, pendingText = "Saving…", className = "btn-primary" }: { children: ReactNode; pendingText?: string; className?: string }) {
  const status = useFormStatus();
  const pending = useContext(PendingContext) || status.pending;
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

/** Inline status line after a save. Success messages fade after a few seconds. */
export function FormMessage({ state }: { state: FormState }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!state.stamp) return;
    setVisible(true);
    if (state.ok) {
      const t = setTimeout(() => setVisible(false), 3500);
      return () => clearTimeout(t);
    }
  }, [state.stamp, state.ok]);
  if (!visible || !state.message) return <span role="status" aria-live="polite" />;
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
      {state.ok ? <Check width={16} height={16} /> : <Info width={16} height={16} />}
      {state.message}
    </span>
  );
}

type FieldProps = { label: string; name: string; error?: string; hint?: ReactNode; optional?: boolean };

function FieldShell({ label, name, error, hint, optional, children }: FieldProps & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? <p id={`${name}-error`} className="mt-1.5 text-xs text-red-700">{error}</p> : hint ? <p id={`${name}-hint`} className="hint">{hint}</p> : null}
    </div>
  );
}

const describedBy = (name: string, error?: string, hint?: ReactNode) => (error ? `${name}-error` : hint ? `${name}-hint` : undefined);

export function TextField({ label, name, error, hint, optional, prefix, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement> & { prefix?: string }) {
  const input = (
    <input
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(name, error, hint)}
      className={`input ${prefix ? "rounded-l-none" : ""}`}
      {...rest}
    />
  );
  return (
    <FieldShell label={label} name={name} error={error} hint={hint} optional={optional}>
      {prefix ? (
        <div className="flex">
          <span className="flex items-center rounded-l-xl border border-r-0 border-line bg-accent-soft px-3 text-sm text-muted">{prefix}</span>
          {input}
        </div>
      ) : input}
    </FieldShell>
  );
}

export function TextArea({ label, name, error, hint, optional, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} name={name} error={error} hint={hint} optional={optional}>
      <textarea id={name} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} className="input min-h-24 resize-y" {...rest} />
    </FieldShell>
  );
}

export function SelectField({ label, name, error, hint, optional, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} name={name} error={error} hint={hint} optional={optional}>
      <select id={name} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy(name, error, hint)} className="input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%237a6a62%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10" {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

/** Small icon/text button that submits a server action, with a pending state. */
export function ActionButton({ children, className = "btn-ghost", label, confirm }: { children: ReactNode; className?: string; label?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-label={label}
      title={label}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
