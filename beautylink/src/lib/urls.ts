/**
 * URL and contact-handle validation. Pure functions, no dependencies, so they
 * can be shared by server actions, the public page and unit tests.
 *
 * Rule of thumb: anything we turn into an <a href> must come out of one of
 * these helpers. Only http(s), mailto:, tel: and wa.me links are ever produced.
 */

export type UrlResult = { ok: true; url: string | null } | { ok: false; error: string };

const MAX_URL_LENGTH = 2048;

/**
 * Validates an external web link (booking page, website).
 * - Empty input is allowed and returns null (field is optional).
 * - Missing scheme is assumed to be https://.
 * - Only http/https are accepted; javascript:, data:, file:, etc. are rejected.
 * - Credentials in the URL and bare hostnames without a dot are rejected.
 */
export function normaliseWebUrl(input: string | null | undefined, label = "Link"): UrlResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: true, url: null };
  if (raw.length > MAX_URL_LENGTH) return { ok: false, error: `${label} is too long.` };
  if (/[\s<>"'`]/.test(raw)) return { ok: false, error: `${label} contains spaces or invalid characters.` };

  const schemeMatch = raw.match(/^([a-z][a-z0-9+.-]*):/i);
  let candidate = raw;
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    // "example.com:8080/x" looks like a scheme but is a host:port.
    const looksLikeHostPort = /^[a-z0-9.-]+\.[a-z]{2,}:\d+/i.test(raw);
    if (!looksLikeHostPort && scheme !== "http" && scheme !== "https") {
      return { ok: false, error: `${label} must start with https:// — "${scheme}:" links are not allowed.` };
    }
    if (looksLikeHostPort) candidate = `https://${raw}`;
  } else {
    candidate = `https://${raw.replace(/^\/+/, "")}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: `${label} doesn't look like a valid web address.` };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: `${label} must be a web address starting with https://.` };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: `${label} must not contain a username or password.` };
  }
  const host = parsed.hostname;
  if (!host.includes(".") || host.endsWith(".") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { ok: false, error: `${label} needs a full domain, e.g. https://www.fresha.com/…` };
  }
  return { ok: true, url: parsed.toString() };
}

/** Re-checks a stored URL right before rendering it. Returns null if unsafe. */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const r = normaliseWebUrl(url);
  return r.ok ? r.url : null;
}

export type TextResult = { ok: true; value: string | null } | { ok: false; error: string };

/** Accepts "@amy.beauty", "amy.beauty" or a full instagram.com URL. */
export function normaliseInstagram(input: string | null | undefined): TextResult {
  return normaliseHandle(input, "Instagram", /(?:^|\/\/)(?:www\.)?instagram\.com\/([^/?#]+)/i, /^[a-z0-9._]{1,30}$/i);
}

/** Accepts "@amy.beauty", "amy.beauty" or a full tiktok.com/@handle URL. */
export function normaliseTiktok(input: string | null | undefined): TextResult {
  return normaliseHandle(input, "TikTok", /(?:^|\/\/)(?:www\.)?tiktok\.com\/@([^/?#]+)/i, /^[a-z0-9._]{2,24}$/i);
}

function normaliseHandle(input: string | null | undefined, label: string, urlPattern: RegExp, handlePattern: RegExp): TextResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: true, value: null };
  const fromUrl = raw.match(urlPattern);
  const handle = (fromUrl ? fromUrl[1] : raw).replace(/^@/, "");
  if (!handlePattern.test(handle)) {
    return { ok: false, error: `${label} handle should look like @yourname (letters, numbers, dots and underscores).` };
  }
  return { ok: true, value: handle };
}

/**
 * UK-friendly phone normalisation into E.164 digits (no "+").
 * "07700 900123" -> "447700900123"; "+44 7700 900123" -> "447700900123".
 */
export function normalisePhone(input: string | null | undefined, label = "Phone number"): TextResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: true, value: null };
  if (!/^[+\d\s().-]+$/.test(raw)) return { ok: false, error: `${label} can only contain digits, spaces and +.` };
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  if (!/^\d{8,15}$/.test(digits)) return { ok: false, error: `${label} doesn't look complete. Try e.g. 07700 900123.` };
  return { ok: true, value: digits };
}

export function normaliseEmail(input: string | null | undefined, label = "Email"): TextResult {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return { ok: true, value: null };
  if (raw.length > 254 || !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(raw)) {
    return { ok: false, error: `${label} doesn't look like a valid email address.` };
  }
  return { ok: true, value: raw };
}

export const instagramUrl = (handle: string) => `https://www.instagram.com/${encodeURIComponent(handle)}/`;
export const tiktokUrl = (handle: string) => `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
export const telHref = (digits: string) => `tel:+${digits}`;
export const mailtoHref = (email: string, subject?: string) =>
  `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
export const whatsappHref = (digits: string, text?: string) =>
  `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** Pretty-print stored E.164 digits for display, UK numbers in local format. */
export function formatPhone(digits: string): string {
  if (digits.startsWith("44") && digits.length === 12) {
    const local = `0${digits.slice(2)}`;
    return `${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${digits}`;
}

const PROVIDERS: Array<[RegExp, string]> = [
  [/(^|\.)fresha\.com$/, "Fresha"],
  [/(^|\.)booksy\.com$/, "Booksy"],
  [/(^|\.)treatwell\.co\.uk$|(^|\.)treatwell\.[a-z.]+$/, "Treatwell"],
  [/(^|\.)square\.site$|(^|\.)squareup\.com$|(^|\.)book\.squareup\.com$/, "Square Appointments"],
  [/(^|\.)setmore\.com$/, "Setmore"],
  [/(^|\.)calendly\.com$/, "Calendly"],
  [/(^|\.)phorest\.com$|(^|\.)phorest\.me$/, "Phorest"],
  [/(^|\.)timely\.(com|app)$|(^|\.)gettimely\.com$/, "Timely"],
  [/(^|\.)vagaro\.com$/, "Vagaro"],
  [/(^|\.)acuityscheduling\.com$/, "Acuity"],
  [/(^|\.)glossgenius\.com$/, "GlossGenius"],
];

/** Hostnames reserved for documentation (RFC 2606) — used for demo links. */
export function isExampleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)example\.(com|org|net)$/.test(host);
  } catch {
    return false;
  }
}

/** Best-effort name of the booking platform behind a URL, for button sub-labels. */
export function detectProvider(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const [pattern, name] of PROVIDERS) if (pattern.test(host)) return name;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
