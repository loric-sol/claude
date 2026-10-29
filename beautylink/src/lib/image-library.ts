/** Bundled illustrations owners can pick from until they upload their own photos. */
export const IMAGE_LIBRARY = [
  { url: "/demo/service-classic-lashes.svg", label: "Classic lashes" },
  { url: "/demo/service-volume-lashes.svg", label: "Volume lashes" },
  { url: "/demo/service-lash-lift.svg", label: "Lash lift" },
  { url: "/demo/service-brows.svg", label: "Brows" },
  { url: "/demo/service-brow-lamination.svg", label: "Brow lamination" },
  { url: "/demo/service-gel-manicure.svg", label: "Gel manicure" },
  { url: "/demo/service-pedicure.svg", label: "Pedicure" },
  { url: "/demo/service-signature-facial.svg", label: "Facial & skincare" },
  { url: "/demo/gallery-nude-set.svg", label: "Nude nail set" },
  { url: "/demo/gallery-chrome-nails.svg", label: "Chrome nails" },
  { url: "/demo/gallery-lash-detail.svg", label: "Lash detail" },
  { url: "/demo/gallery-brow-result.svg", label: "Brow result" },
  { url: "/demo/gallery-skincare-shelf.svg", label: "Skincare shelf" },
  { url: "/demo/gallery-arches.svg", label: "Arches" },
] as const;

export const COVER_LIBRARY = [
  { url: "/demo/amy-cover.svg", label: "Blush arches" },
  { url: "/demo/cover-linen.svg", label: "Linen" },
  { url: "/demo/cover-sage.svg", label: "Sage" },
  { url: "/demo/cover-noir.svg", label: "Noir" },
] as const;

export const LOGO_LIBRARY = [{ url: "/demo/amy-logo.svg", label: "Monogram (demo)" }] as const;

/** Stored image URLs must be bundled assets or files uploaded through BeautyLink. */
export function isAllowedImageUrl(url: string): boolean {
  return /^\/demo\/[a-z0-9-]+\.svg$/.test(url) || /^\/api\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(url);
}
