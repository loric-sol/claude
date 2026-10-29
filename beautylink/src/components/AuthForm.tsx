"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, demoLoginAction } from "@/app/auth-actions";
import { initialFormState } from "@/lib/form";
import { ActionForm, SubmitButton, TextField } from "./ui/form";

export function AuthForm({ mode, demoEnabled }: { mode: "login" | "signup"; demoEnabled: boolean }) {
  const [state, action] = useActionState(mode === "login" ? loginAction : signupAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="font-display text-2xl italic">BeautyLink</Link>
      <h1 className="mt-8 font-display text-4xl">{mode === "login" ? "Welcome back" : "Create your page"}</h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "login" ? "Log in to edit your page and see your stats." : "Free to try. Set up your booking-ready page in under 10 minutes."}
      </p>
      <ActionForm action={action} className="mt-8 space-y-4">
        <TextField label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          error={e.password}
          hint={mode === "signup" ? "At least 8 characters." : undefined}
        />
        {state.message && !state.ok && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
        <SubmitButton className="btn-primary w-full py-3" pendingText={mode === "login" ? "Logging in…" : "Creating account…"}>
          {mode === "login" ? "Log in" : "Create account"}
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm text-muted">
        {mode === "login" ? <>New to BeautyLink? <Link className="text-ink underline" href="/signup">Create an account</Link></> : <>Already have an account? <Link className="text-ink underline" href="/login">Log in</Link></>}
      </p>
      {demoEnabled && (
        <form action={demoLoginAction} className="mt-8 rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-medium">Just looking?</p>
          <p className="mt-1 text-xs text-muted">Explore the dashboard for the fictional Amy Beauty Studio. No account needed; demo data can be reset any time.</p>
          <SubmitButton className="btn-secondary mt-3 w-full" pendingText="Opening demo…">Explore the demo dashboard</SubmitButton>
        </form>
      )}
    </div>
  );
}
