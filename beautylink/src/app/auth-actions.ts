"use server";

import { redirect } from "next/navigation";
import { createUser, endSession, findUserByEmail, getDemoUserId, startSession, verifyPassword } from "@/lib/auth";
import { db, demoModeEnabled } from "@/lib/db";
import { str, type FormState } from "@/lib/form";
import { normaliseEmail } from "@/lib/urls";

export async function signupAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = normaliseEmail(str(fd, "email"));
  const password = String(fd.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!email.ok || !email.value) errors.email = email.ok ? "Email is required." : email.error;
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password.length > 200) errors.password = "That password is too long.";
  if (Object.keys(errors).length || !email.ok || !email.value) return { ok: false, errors, stamp: Date.now() };
  if (findUserByEmail(email.value)) return { ok: false, errors: { email: "An account with this email already exists. Try logging in." }, stamp: Date.now() };
  const id = createUser(email.value, password);
  await startSession(id);
  redirect("/onboarding");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = email ? findUserByEmail(email) : undefined;
  // Same message whether the email or the password is wrong.
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { ok: false, message: "That email and password don't match an account.", stamp: Date.now() };
  }
  await startSession(user.id);
  redirect("/dashboard");
}

export async function demoLoginAction() {
  if (!demoModeEnabled()) redirect("/login");
  db(); // ensures the demo business is seeded
  const id = getDemoUserId();
  if (!id) redirect("/login");
  await startSession(id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}
