export const CATEGORIES = [
  "Lash & brow artist",
  "Nail technician",
  "Hair stylist",
  "Facialist & skincare",
  "Makeup artist",
  "Beauty therapist",
  "Aesthetics practitioner",
  "Beauty salon",
] as const;

/** Paths that can never be used as a business slug. */
export const RESERVED_SLUGS = new Set([
  "api", "dashboard", "login", "logout", "signup", "register", "admin", "settings", "demo",
  "about", "pricing", "help", "support", "terms", "privacy", "static", "public", "assets",
  "uploads", "_next", "favicon.ico", "robots.txt", "sitemap.xml", "beautylink", "account",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function slugError(slug: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) {
    return "Use 3–40 lowercase letters, numbers or hyphens (no spaces), e.g. amybeauty.";
  }
  if (RESERVED_SLUGS.has(slug)) return "That address is reserved. Please choose another.";
  return null;
}
