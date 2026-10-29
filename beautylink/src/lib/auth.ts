import "server-only";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { getBusinessesForOwner } from "./repo";
import type { Business, User } from "./types";

/**
 * Local email + password authentication for the prototype.
 * - Passwords: scrypt with a per-user random salt.
 * - Sessions: random 256-bit token in an httpOnly cookie; only its SHA-256
 *   hash is stored, so a leaked database cannot be used to hijack sessions.
 * In production this module is replaced by Supabase Auth (see README).
 */

const COOKIE = "bl_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db().prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, expires.toISOString());
  db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db().prepare(
    `SELECT u.id, u.email, u.is_demo FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
  ).get(sha256(token), new Date().toISOString()) as { id: string; email: string; is_demo: number } | undefined;
  return row ? { id: row.id, email: row.email, is_demo: Boolean(row.is_demo) } : null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * The business the dashboard is editing. The schema supports several
 * businesses per owner; the MVP UI works on the first one.
 */
export const getCurrentBusiness = cache(async (): Promise<{ user: User; business: Business | null }> => {
  const user = await requireUser();
  const [business] = getBusinessesForOwner(user.id);
  return { user, business: business ?? null };
});

export async function requireBusiness(): Promise<{ user: User; business: Business }> {
  const { user, business } = await getCurrentBusiness();
  if (!business) redirect("/onboarding");
  return { user, business };
}

export function createUser(email: string, password: string): string {
  const id = randomUUID();
  db().prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(id, email, hashPassword(password));
  return id;
}

export function findUserByEmail(email: string) {
  return db().prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as
    | { id: string; email: string; password_hash: string }
    | undefined;
}

export function getDemoUserId(): string | null {
  const r = db().prepare("SELECT id FROM users WHERE is_demo = 1 LIMIT 1").get() as { id: string } | undefined;
  return r?.id ?? null;
}
