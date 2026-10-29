/** Money is always stored as integer pence. These helpers never use floats for parsing. */

export function formatPrice(pence: number, currency = "GBP"): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pounds);
}

/** "45" -> 4500, "45.5" -> 4550, "£32.00" -> 3200. Returns null when invalid. */
export function parsePriceToPence(input: string | null | undefined): number | null {
  const raw = (input ?? "").trim().replace(/^£/, "").replace(/,/g, "");
  const m = raw.match(/^(\d{1,6})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const pounds = Number(m[1]);
  const pence = Number((m[2] ?? "").padEnd(2, "0") || "0");
  return pounds * 100 + pence;
}

export function penceToInput(pence: number): string {
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatPercent(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  const pct = (numerator / denominator) * 100;
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}
