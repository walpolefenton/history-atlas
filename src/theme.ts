// Map themes. The page chrome is themed in CSS through [data-theme] on <html>;
// the map can't read CSS, so its colours live here.

export type ThemeName = "night" | "survey";
export type ThemeChoice = ThemeName | "auto";

export interface MapTheme {
  /** Ocean surface of the globe. */
  ocean: string;
  land: string;
  /** Concentric lines (survey) or a soft glow (night) around coastlines. */
  coast: { color: string; widths: number[]; opacities: number[]; blur: number };
  border: string;
  hover: string;
  accent: string;
  label: string;
  labelMuted: string;
  halo: string;
  /** Territory fills, indexed by each ruler's stable colour index. */
  palette: string[];
  fillOpacity: number;
  /** Fill opacity for territories with approximate borders. */
  fillOpacityApprox: number;
  sky: Record<string, unknown>;
  /** Event medallion colours by type. */
  events: Record<string, string>;
  capital: string;
  /** Solid ring drawn around markers so they stand off the map. */
  ring: string;
  /** RGB triplet for terrain textures, e.g. "90,75,55". */
  ink: string;
}

export const THEMES: Record<ThemeName, MapTheme> = {
  // A globe hanging in space: jewel-toned territories, brass instruments.
  night: {
    ocean: "#0f2438",
    land: "#1a2530",
    coast: { color: "#4f8fb8", widths: [2, 6, 14], opacities: [0.28, 0.12, 0.05], blur: 4 },
    border: "rgba(4, 9, 16, 0.75)",
    hover: "#f3ead8",
    accent: "#d9b26a",
    label: "#efe7d6",
    labelMuted: "#b9b09e",
    halo: "rgba(5, 10, 18, 0.82)",
    palette: ["#6f977a", "#a8775d", "#8576a3", "#b99a55", "#5888a1", "#a05f6a", "#679387", "#ad8257", "#7886ad", "#93845a", "#58775c", "#9c7389"],
    fillOpacity: 0.62,
    fillOpacityApprox: 0.42,
    sky: {
      "sky-color": "#050912",
      "horizon-color": "#1d4a73",
      "fog-color": "#0c1a2a",
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.5,
      "fog-ground-blend": 0.8,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 4, 0.8, 7, 0],
    },
    events: {
      conflict: "#d65a4f",
      diplomacy: "#4f9ad6",
      political: "#d3a63a",
      culture: "#9a7ad8",
      exploration: "#4fae6a",
      crisis: "#d77a3a",
    },
    capital: "#d9b26a",
    ring: "#08101c",
    ink: "225,215,190",
  },
  // A hand-tinted 19th-century lithograph atlas: pale sea with water lining.
  survey: {
    ocean: "#cddbe3",
    land: "#f5f3ec",
    coast: { color: "#6f90a6", widths: [1.2, 4.5, 8.5, 13], opacities: [0.75, 0.5, 0.34, 0.2], blur: 0 },
    border: "rgba(70, 60, 50, 0.6)",
    hover: "#2b2a33",
    accent: "#a8362a",
    label: "#2b2a33",
    labelMuted: "#5d5a63",
    halo: "rgba(250, 248, 242, 0.85)",
    palette: ["#c6d6a3", "#ebc29a", "#c6b6d9", "#efd996", "#a7c9d8", "#e2adad", "#b7d5c4", "#e6c8a0", "#bdc4e2", "#d6cd9d", "#b2c7a2", "#dcb7c8"],
    fillOpacity: 0.78,
    fillOpacityApprox: 0.5,
    sky: {
      "sky-color": "#e4eaee",
      "horizon-color": "#ffffff",
      "fog-color": "#e4eaee",
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 4, 0.4, 7, 0],
    },
    events: {
      conflict: "#b23b2e",
      diplomacy: "#2f6ea3",
      political: "#a5781c",
      culture: "#6c4fa3",
      exploration: "#3a7d4a",
      crisis: "#b55d22",
    },
    capital: "#a8362a",
    ring: "#fbf9f3",
    ink: "90,75,55",
  },
};

const STORAGE_KEY = "atlas-theme";

export function loadThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "night" || v === "survey" || v === "auto") return v;
  } catch {
    /* storage unavailable: fall back to auto */
  }
  return "auto";
}

export function saveThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* not critical */
  }
}

export function resolveTheme(choice: ThemeChoice): ThemeName {
  if (choice !== "auto") return choice;
  return matchMedia("(prefers-color-scheme: light)").matches ? "survey" : "night";
}

/** Applies a theme to the page and notifies listeners (the maps). */
export function applyTheme(choice: ThemeChoice) {
  const name = resolveTheme(choice);
  document.documentElement.dataset.theme = name;
  window.dispatchEvent(new CustomEvent<ThemeName>("atlas-theme", { detail: name }));
  return name;
}

export function currentTheme(): MapTheme {
  return THEMES[(document.documentElement.dataset.theme as ThemeName) ?? "night"] ?? THEMES.night;
}
