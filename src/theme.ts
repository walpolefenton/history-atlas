// Map themes. The page chrome is themed in CSS through [data-theme] on <html>;
// the map can't read CSS, so its colours live here.

export type ThemeName = "night" | "survey" | "clay";

/**
 * Colour families by cultural region, four shades each, in the order the data
 * build assigns them (scripts/prepare-data.mjs, REGIONS). Pigments are chosen
 * to evoke each region's material culture without being literal.
 */
const REGION_FAMILIES: Record<string, string[]> = {
  // Heraldic madder, cobalt, verdigris, murrey
  europe: ["#a8616a", "#5f79ad", "#5e9486", "#8c6a9c"],
  // Lapis, turquoise tile, saffron, pomegranate
  mena: ["#3f6fa8", "#3f9d9a", "#c39a48", "#a2565e"],
  // Felt, steppe sky, dun horse, larch
  steppe: ["#a98a5e", "#7f9cb8", "#b8a074", "#7a8f68"],
  // Vermilion lacquer, jade, ink-blue porcelain, imperial ochre
  eastAsia: ["#c0574c", "#5c9c80", "#4c6fa6", "#c79a3e"],
  // Saffron, rose madder, indigo, marigold
  southAsia: ["#d18a3c", "#b56a86", "#5a64a3", "#c8a83e"],
  // Teak, lagoon, orchid, rice-paddy green
  seAsiaOceania: ["#a97b4f", "#4b97a6", "#9a72a6", "#78a35a"],
  // Ochre, indigo cloth, terracotta, savanna green
  africa: ["#c28a3e", "#4f63a0", "#b25e42", "#6f9a56"],
  // Jade, cochineal, gold, turquoise
  americas: ["#4f9a7e", "#b04a5f", "#c79f45", "#3f95ad"],
};
const REGION_ORDER = ["europe", "mena", "steppe", "eastAsia", "southAsia", "seAsiaOceania", "africa", "americas"];
const NIGHT_PALETTE = REGION_ORDER.flatMap((r) => REGION_FAMILIES[r]);

/** Mixes a hex colour toward another, for the lighter hand-tinted Survey palette. */
function mix(hex: string, toward: string, amount: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(toward)];
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("");
}
const SURVEY_PALETTE = NIGHT_PALETTE.map((c) => mix(c, "#fbf7ec", 0.5));
/** Plasticine: the same families, pushed warmer and more saturated. */
const CLAY_PALETTE = NIGHT_PALETTE.map((c) => saturate(mix(c, "#f3d9b0", 0.18), 1.25));

function saturate(hex: string, factor: number) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const grey = (r + g + b) / 3;
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(grey + (v - grey) * factor))).toString(16).padStart(2, "0")).join("");
}
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
  /** Watercolour wash inside the pen drawings. */
  wash: string;
  /** A paler wash for background scenery. */
  washSoft: string;
  /** Peak opacity of the large regional murals. */
  muralOpacity: number;
  /** Shaded relief from elevation data; strength 0 turns it off. */
  relief: { exaggeration: number; shadow: string; highlight: string; accent: string };
  /** Clay styling: sculpted seams on borders, a fingerprint grain, moulded markers. */
  clay: boolean;
}

export const THEMES = {
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
    palette: NIGHT_PALETTE.map((c) => mix(c, "#1a2530", 0.18)),
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
    wash: "rgba(217, 178, 106, 0.42)",
    washSoft: "rgba(217, 178, 106, 0.16)",
    muralOpacity: 0.32,
    relief: { exaggeration: 0.32, shadow: "rgba(0, 0, 0, 0.5)", highlight: "rgba(180, 210, 240, 0.12)", accent: "rgba(0, 0, 0, 0.3)" },
    clay: false,
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
    palette: SURVEY_PALETTE,
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
    wash: "rgba(168, 54, 42, 0.2)",
    washSoft: "rgba(120, 90, 60, 0.08)",
    muralOpacity: 0.3,
    relief: { exaggeration: 0.32, shadow: "rgba(80, 70, 60, 0.35)", highlight: "rgba(255, 255, 255, 0.25)", accent: "rgba(80, 70, 60, 0.2)" },
    clay: false,
  },
} as unknown as Record<ThemeName, MapTheme>;

// Plasticine and modelling clay, after stop-motion animation: a sculpted globe
// with strong relief, saturated earth colours and moulded markers.
THEMES.clay = {
  ocean: "#3d7380",
  land: "#d8c29c",
  coast: { color: "#2a5560", widths: [2.5, 7], opacities: [0.45, 0.18], blur: 2 },
  border: "rgba(60, 35, 20, 0.6)",
  hover: "#2a1d14",
  accent: "#e0782a",
  label: "#2e2018",
  labelMuted: "#5e4a3a",
  halo: "rgba(246, 236, 218, 0.85)",
  palette: CLAY_PALETTE,
  fillOpacity: 0.86,
  fillOpacityApprox: 0.62,
  sky: {
    "sky-color": "#e9dcc4",
    "horizon-color": "#fff3de",
    "fog-color": "#e9dcc4",
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 4, 0.4, 7, 0],
  },
  events: {
    conflict: "#d2452f",
    diplomacy: "#2f73c9",
    political: "#e0a41f",
    culture: "#8a4fc4",
    exploration: "#3f9f4a",
    crisis: "#e0702a",
  },
  capital: "#e0782a",
  ring: "#f6ecda",
  ink: "70,45,25",
  wash: "rgba(224, 120, 42, 0.55)",
  washSoft: "rgba(224, 160, 90, 0.3)",
  muralOpacity: 0.34,
  relief: { exaggeration: 0.7, shadow: "rgba(60, 30, 10, 0.62)", highlight: "rgba(255, 246, 228, 0.55)", accent: "rgba(90, 50, 20, 0.4)" },
  clay: true,
};

const STORAGE_KEY = "atlas-theme";

export function loadThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "night" || v === "survey" || v === "clay" || v === "auto") return v;
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
