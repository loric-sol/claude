export const THEMES = {
  blush: {
    name: "Blush",
    description: "Warm cream with soft blush accents",
    swatches: ["#FBF6F1", "#EBCFC8", "#2B201B"],
  },
  linen: {
    name: "Linen",
    description: "Natural beige, stone and espresso",
    swatches: ["#F5F0E8", "#CDB89C", "#231C17"],
  },
  sage: {
    name: "Sage",
    description: "Calm off-white with muted sage",
    swatches: ["#F4F3EE", "#B7C1AE", "#1F2420"],
  },
  noir: {
    name: "Noir",
    description: "Evening black with champagne details",
    swatches: ["#16120F", "#D9C1A3", "#F6EFE7"],
  },
} as const;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const isThemeId = (v: string): v is ThemeId => v in THEMES;
