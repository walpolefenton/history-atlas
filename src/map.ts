import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre finds its worker relative to its own module, which breaks once
// bundled; point it at the emitted worker file explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { Admin1Data, Drawing, EventType, HistoryEvent, SurveyorSpot, YearData } from "./types";
import { currentTheme, type MapTheme } from "./theme";
import { formatYear } from "./format";
import { capitalIconSvg, eventIconSvg, modernEventSvg, svgToImage } from "./icons";
import { DRAWING_KINDS, SCENERY_KINDS, VARIANTS, drawingSvg } from "./drawings";
import { MEDALLION_PX, drawingImage, loadImages, medallion } from "./images";

maplibregl.setWorkerUrl(workerUrl);

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

// --- Lettering ------------------------------------------------------------------
// Labels render from self-hosted font files (scripts/fetch-fonts.mjs); the glyph
// server only fills in characters those files lack. The lettering follows the
// history of type: inscriptional capitals for the ancient world, early printing
// type until 1800, a contemporary serif after.
const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
const FONT_URL = new URL(import.meta.env.BASE_URL + "fonts/", location.href).href;
const FONT_FACES = {
  "Spectral Regular": FONT_URL + "Spectral-Regular.ttf",
  "Spectral Italic": FONT_URL + "Spectral-Italic.ttf",
  "Spectral Medium": FONT_URL + "Spectral-Medium.ttf",
  Cinzel: FONT_URL + "Cinzel.ttf",
  "IM Fell": FONT_URL + "IMFellEnglish-Regular.ttf",
  "IM Fell Italic": FONT_URL + "IMFellEnglish-Italic.ttf",
};

export type LetteringEra = "ancient" | "printed" | "modern";
interface Lettering {
  regular: string[];
  major: string[];
  italic: string[];
}
const LETTERING: Record<LetteringEra, Lettering> = {
  ancient: { regular: ["Cinzel"], major: ["Cinzel"], italic: ["IM Fell Italic"] },
  printed: { regular: ["IM Fell"], major: ["IM Fell"], italic: ["IM Fell Italic"] },
  modern: { regular: ["Spectral Regular"], major: ["Spectral Medium"], italic: ["Spectral Italic"] },
};
export const letteringEra = (year: number): LetteringEra => (year < 500 ? "ancient" : year < 1800 ? "printed" : "modern");

/** Territories at least this large get spaced capital-letter labels, like a printed atlas. */
const MAJOR_KM2 = 1_500_000;
/** Territories smaller than this are only labelled once you zoom in. */
const MINOR_KM2 = 250_000;
const EVENT_TYPES: EventType[] = ["conflict", "diplomacy", "political", "culture", "exploration", "crisis"];
const TERRAIN_KINDS = ["desert", "mountains", "plateau", "tundra", "wetland"] as const;
/** Zoom at which each tier of scattered scenery appears; the globe fills in as you approach. */
const SCENERY_MINZOOM = { 1: 1.9, 2: 2.8, 3: 3.6, 4: 4.5 } as const;
/** Kinds drawn as large regional murals (scripts/prepare-scenery.mjs, MURALS). */
const MURAL_KINDS = ["mammoth", "hippo", "wheat", "bison", "pyramid", "stepped", "temple", "arena", "stupa", "wall", "town-southasia", "onion", "pagoda",
  "towers", "rider", "town-steppe", "camel", "dune", "town-africa", "terraces", "castle", "cathedral", "minarets", "town-industrial", "town-metro",
  "jungle", "kangaroo", "pine", "whale", "compass", "wind", "canoe", "longship", "dhow", "junk", "galleon", "steamship", "container"];
/** Zoom at which each drawing tier appears: 1 from afar, 3 only up close. */
const TIER_MINZOOM = { 1: 1.4, 2: 2.6, 3: 3.4 } as const;
const SURVEYOR_MINZOOM = 3.6;
/** Snapshots that fall in the African Humid Period, when the Sahara was green. */
const isGreenSahara = (year: number) => year >= -9000 && year <= -3500;
const SAVANNA = { night: "#2b4230", survey: "#d9e6bf", clay: "#a9b86a", atlas: "#dfe8cf", "atlas-dark": "#263a2a" };
/** Open elevation tiles (Mapzen terrain on AWS Open Data), used for shaded relief. */
const RELIEF_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const CROSSFADE_MS = 750;

export interface MapHandlers {
  onPolityClick(name: string): void;
  onEventClick(id: string): void;
  onDrawingClick(id: string): void;
  onSurveyorClick(): void;
  onRouteClick(name: string): void;
  onCityClick(qid: string): void;
  onAdminClick(name: string, country: string): void;
}

export interface MapOptions {
  /** The comparison map: no controls or attribution of its own. */
  secondary?: boolean;
}

// --- Theme-dependent images ----------------------------------------------------

/** Small repeating textures (32px tiles shown at 16px) that give terrain a printed feel. */
function patternSvg(kind: string, t: MapTheme): string {
  const ink = `rgba(${t.ink},`;
  const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${body}</svg>`;
  switch (kind) {
    case "land":
      return svg(`<circle cx="6" cy="9" r="0.9" fill="${ink}0.10)"/><circle cx="22" cy="25" r="0.9" fill="${ink}0.10)"/>`);
    case "desert":
      return svg(
        [[4, 5], [14, 3], [25, 7], [9, 14], [20, 15], [29, 18], [3, 23], [15, 25], [24, 28]]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${ink}0.38)"/>`)
          .join(""),
      );
    case "mountains":
      return svg(`<path d="M3 13 L8 7 L13 13 M18 28 L23 22 L28 28" fill="none" stroke="${ink}0.42)" stroke-width="1.5" stroke-linejoin="round"/>`);
    case "plateau":
      return svg(`<path d="M4 10 H12 M20 26 H28" stroke="${ink}0.32)" stroke-width="1.4" stroke-linecap="round"/>`);
    case "tundra":
      return svg(`<path d="M3 8 H9 M18 8 H24 M10 20 H16 M25 20 H31" stroke="${ink}0.26)" stroke-width="1.2" stroke-linecap="round"/>`);
    case "clay": // fingerprint ridges pressed into the clay
      return svg(`<path d="M3 20 Q9 12 16 18 Q22 24 29 16 M2 27 Q9 19 17 25 Q23 30 30 23 M4 12 Q10 5 17 11 Q23 16 29 9" fill="none" stroke="${ink}0.09)" stroke-width="1.1" stroke-linecap="round"/>`);
    default: // wetland: tufts of reeds
      return svg(`<path d="M6 14 V10 M8 14 V8 M10 14 V10 M22 29 V25 M24 29 V23 M26 29 V25" stroke="${ink}0.34)" stroke-width="1.2" stroke-linecap="round"/>`);
  }
}

/** What covers the land (scripts/prepare-landcover.mjs), painted as textured areas. */
const COVERS = ["broadleaf", "conifer", "jungle", "grassland", "savanna", "farmland"] as const;

/** Repeatable 0..1 from integers, for textures drawn by hand but the same every time. */
const jitter = (i: number, j: number, salt: number) => {
  const h = Math.sin(i * 127.1 + j * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

/**
 * Farmland as a patchwork: a tile of irregular plots meeting along shared
 * hedges, in two tones, each furrowed its own way. Plot corners on the tile's
 * edges repeat, so the tile joins seamlessly with its neighbours.
 */
function farmSvg(t: MapTheme, ripe: string, green: string) {
  const ink = `rgba(${t.ink},`;
  const N = 3;
  const S = 128 / N;
  const wrap = (i: number) => ((i % N) + N) % N;
  const corner = (i: number, j: number): [number, number] => [
    i * S + (jitter(wrap(i), wrap(j), 1) - 0.5) * S * 0.7,
    j * S + (jitter(wrap(i), wrap(j), 2) - 0.5) * S * 0.7,
  ];
  const furrows = Array.from({ length: 30 }, (_, k) => `M-60 ${-60 + k * 6} H190`).join(" ");
  const clips: string[] = [];
  const plots: string[] = [];
  // One ring of cells beyond the tile too, so plots cut by its edge are complete.
  for (let i = -1; i <= N; i++)
    for (let j = -1; j <= N; j++) {
      const pts = [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];
      const d = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")} Z`;
      const r = jitter(wrap(i), wrap(j), 3);
      const id = `p${i + 1}_${j + 1}`;
      const fallow = r < 0.3;
      const angle = [0, 45, 90, 135][Math.floor(jitter(wrap(i), wrap(j), 4) * 4)];
      clips.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
      plots.push(
        (fallow ? "" : `<path d="${d}" fill="${r < 0.55 ? ripe : green}" fill-opacity="0.32"/>`) +
          (fallow ? "" : `<g clip-path="url(#${id})"><path d="${furrows}" transform="rotate(${angle} 64 64)" stroke="${ink}0.2)" stroke-width="0.8"/></g>`) +
          `<path d="${d}" fill="none" stroke="${ink}0.26)" stroke-width="1"/>`,
      );
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs>${clips.join("")}</defs>${plots.join("")}</svg>`;
}

/** How each kind of cover is drawn: a mark, how densely marks are sown, and their ink. */
const MARKS: Record<string, { grid: number; density: number; alpha: number; mark: (x: number, y: number, k: number, r: number) => string; shade?: (x: number, y: number, k: number) => string }> = {
  // Woodland: rounded crowns on short stems, shaded on the east.
  broadleaf: {
    grid: 7, density: 0.85, alpha: 0.42,
    mark: (x, y, k) => `M${x - 4 * k} ${y} a${4 * k} ${4 * k} 0 1 1 ${8 * k} 0 M${x} ${y} v${2.5 * k}`,
    shade: (x, y, k) => `M${x + 1.5 * k} ${y - 1 * k} l${2 * k} -${2 * k}`,
  },
  // Conifers: narrow spikes.
  conifer: { grid: 8, density: 0.85, alpha: 0.42, mark: (x, y, k) => `M${x - 2.5 * k} ${y} L${x} ${y - 7 * k} L${x + 2.5 * k} ${y} M${x} ${y} v${2 * k}` },
  // Rainforest: dense double scallops.
  jungle: { grid: 7, density: 1, alpha: 0.36, mark: (x, y, k) => `M${x - 5 * k} ${y} q${2.5 * k} -${5 * k} ${5 * k} 0 q${2.5 * k} -${5 * k} ${5 * k} 0` },
  // Grass: sparse tufts.
  grassland: { grid: 6, density: 0.5, alpha: 0.32, mark: (x, y, k) => `M${x - 2 * k} ${y} l-${k} -${3 * k} M${x} ${y} v-${4 * k} M${x + 2 * k} ${y} l${k} -${3 * k}` },
  // Savanna: tufts, and now and then a flat-topped acacia.
  savanna: {
    grid: 6, density: 0.5, alpha: 0.34,
    mark: (x, y, k, r) =>
      r < 0.18 ? `M${x} ${y} v-${5 * k} M${x - 5 * k} ${y - 5 * k} q${5 * k} -${3 * k} ${10 * k} 0` : `M${x - 2 * k} ${y} l-${k} -${3 * k} M${x} ${y} v-${4 * k} M${x + 2 * k} ${y} l${k} -${3 * k}`,
  },
  // Mountains: broad hills in profile, as on old maps, their east slopes hatched.
  mountains: {
    grid: 5, density: 0.8, alpha: 0.38,
    mark: (x, y, k) => `M${x - 10 * k} ${y} Q${x - 4 * k} ${y - 12 * k} ${x} ${y - 12 * k} Q${x + 4 * k} ${y - 12 * k} ${x + 10 * k} ${y}`,
    shade: (x, y, k) =>
      [2, 4.5, 7].map((o) => `M${x + o * k} ${y - (12 - o * 1.2) * k + 1} l${1.2 * k} ${(9 - o * 1.1) * k}`).join(" "),
  },
};

/**
 * An engraved texture: marks sown over a 128-unit tile, one per cell of a grid
 * but jittered, varied in size, with some cells left bare, so the repeat doesn't
 * show. Marks near an edge are drawn again on the opposite edge, so the tile
 * joins seamlessly. Everything is shaded on the east, like the rest of the map.
 */
function coverSvg(kind: string, t: MapTheme, themeName: string) {
  if (kind === "farmland") return farmSvg(t, ...(FIELD_TINT[themeName] ?? FIELD_TINT.night));
  const ink = `rgba(${t.ink},`;
  const m = MARKS[kind];
  const cell = 128 / m.grid;
  const salt = kind.length * 13;
  let d = "";
  let shade = "";
  for (let i = 0; i < m.grid; i++)
    for (let j = 0; j < m.grid; j++) {
      const r = jitter(i, j, salt);
      if (r > m.density) continue;
      // Stagger alternate rows, then jitter within the cell.
      const x = (i + 0.5 + (j % 2) * 0.5 + (jitter(i, j, salt + 1) - 0.5) * 0.6) * cell;
      const y = (j + 0.5 + (jitter(i, j, salt + 2) - 0.5) * 0.5) * cell;
      const k = 0.8 + jitter(i, j, salt + 3) * 0.45;
      for (const dx of [-128, 0, 128])
        for (const dy of [-128, 0, 128]) {
          const [px, py] = [x + dx, y + dy];
          if (px < -16 || px > 144 || py < -16 || py > 144) continue;
          d += m.mark(px, py, k, r / m.density) + " ";
          if (m.shade) shade += m.shade(px, py, k) + " ";
        }
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}" stroke="${ink}${m.alpha})" stroke-width="1.1"/>${shade ? `<path d="${shade}" stroke="${ink}${m.alpha * 0.8})" stroke-width="0.9"/>` : ""}</g></svg>`;
}

/** Land-cover tints by theme: a wash under each texture. */
const COVER_TINT: Record<string, Record<(typeof COVERS)[number], string>> = {
  night: { broadleaf: "#2f4a35", conifer: "#28423a", jungle: "#2a4d33", grassland: "#4a4a32", savanna: "#5a4e30", farmland: "#5a5236" },
  survey: { broadleaf: "#9fb88a", conifer: "#8eab8c", jungle: "#86b07c", grassland: "#cfcf9a", savanna: "#d9c88f", farmland: "#d6c995" },
  clay: { broadleaf: "#8f9c5a", conifer: "#7d8f60", jungle: "#7f9a52", grassland: "#c9b878", savanna: "#d1ad6a", farmland: "#cfae6c" },
  atlas: { broadleaf: "#a9c09a", conifer: "#98b49d", jungle: "#93b98b", grassland: "#d8dbb0", savanna: "#e0d3a6", farmland: "#ded3a6" },
  "atlas-dark": { broadleaf: "#2a4231", conifer: "#243c35", jungle: "#27462f", grassland: "#37392b", savanna: "#3f3a2a", farmland: "#3d3a26" },
};

/** Watercolour paper: a faint, seamlessly tiling grain laid over the territories. */
function paperSvg(t: MapTheme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" numOctaves="3" seed="9" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 ${t.clay ? 0.35 : 0.2}  0 0 0 0 ${t.clay ? 0.22 : 0.17}  0 0 0 0 0.12  0 0 0 0.55 -0.18"/></filter>
    <rect width="128" height="128" filter="url(#g)"/></svg>`;
}

/** A chain of peaks, repeated along each mountain range's spine. */
function rangePatternSvg(t: MapTheme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="64" viewBox="0 0 96 32"><g stroke="${t.labelMuted}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M0 29 L9 13 L18 29 Z M16 29 L29 5 L42 29 Z M40 29 L50 14 L60 29 Z M57 29 L71 7 L85 29 Z M83 29 L90 19 L96 29" fill="${t.washSoft}"/>
    <path d="M25 12 L29 15 L32 11 M67 13 L71 16 L74 12" fill="none"/><path d="M33 17 L37 23 M36 24 L39 29 M76 17 L80 23 M79 25 L82 29 M53 20 L56 26" fill="none" opacity=".6"/></g></svg>`;
}

/** A length of crenellated wall with a watchtower, repeated along the Great Wall. */
function wallPatternSvg(t: MapTheme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="32" viewBox="0 0 64 16"><g stroke="${t.label}" stroke-width="0.9" stroke-linejoin="round">
    <path d="M0 13 V8 H3 V6 H5 V8 H8 V6 H10 V8 H13 V6 H15 V8 H18 V6 H20 V8 H23 V6 H25 V8 H28 V3 H36 V8 H39 V6 H41 V8 H44 V6 H46 V8 H49 V6 H51 V8 H54 V6 H56 V8 H59 V6 H61 V8 H64 V13 Z" fill="${t.wash}"/>
    <path d="M30 3 V1 M34 3 V1 M31 8 V10 H33 V8" fill="none"/></g></svg>`;
}

/** Footprint dots for caravan trails. */
function trailPatternSvg(t: MapTheme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="16" viewBox="0 0 24 8"><g fill="${t.labelMuted}"><circle cx="4" cy="3" r="1.1"/><circle cx="9" cy="5" r="1.1"/><circle cx="16" cy="3" r="1.1"/><circle cx="21" cy="5" r="1.1"/></g></svg>`;
}

/** Atlas markers: a solid dot in the event's colour on a white rim. */
const dotSvg = (fill: string, rim: string, r = 9, inner = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="${r + 3}" fill="${rim}"/><circle cx="16" cy="16" r="${r}" fill="${fill}"/>${inner}</svg>`;
/** A capital: a ring around a dot, the reference-atlas convention. */
const capitalDotSvg = (ink: string, rim: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="10" fill="${rim}"/><circle cx="16" cy="16" r="7.5" fill="none" stroke="${ink}" stroke-width="2"/><circle cx="16" cy="16" r="3.2" fill="${ink}"/></svg>`;

async function themeImages(t: MapTheme): Promise<Record<string, HTMLImageElement>> {
  const themeName = document.documentElement.dataset.theme ?? "night";
  const entries: [string, string, number][] = [
    ...EVENT_TYPES.map((k): [string, string, number] => [`event-${k}`, eventIconSvg(k, t.events[k], t.ring, t.clay), 64]),
    ["capital", capitalIconSvg(t.capital, t.ring, t.clay), 64],
    ["pat-clay", patternSvg("clay", t), 32],
    ["pat-land", patternSvg("land", t), 32],
    ...TERRAIN_KINDS.map((k): [string, string, number] => [`pat-${k}`, patternSvg(k, t), 32]),
    // Landmarks share the landscape's pen; their colour wash and size set them apart.
    ...DRAWING_KINDS.map((k, i): [string, string, number] => [`draw-${k}`, drawingSvg(k, t.clay ? t.label : t.labelMuted, t.wash, t.clay ? t.ring : "none", i + 1, t.clay, 256, t.clay ? 1 : 0.9), 256]),
    // Scenery is drawn in a quieter ink, so it never competes with labels.
    // Scenery comes in several hand-varied versions: scn-oak, scn-oak~1, scn-oak~2...
    ...SCENERY_KINDS.flatMap((k, i) =>
      Array.from({ length: VARIANTS }, (_, v): [string, string, number] => [v ? `scn-${k}~${v}` : `scn-${k}`, drawingSvg(k, t.labelMuted, t.washSoft, "none", i + 11, t.clay, 192, 1, v, true), 192]),
    ),
    // Murals are big and faint; render them large so they stay crisp.
    ...MURAL_KINDS.map((k, i): [string, string, number] => [`mural-${k}`, drawingSvg(k, t.label, t.wash, "transparent", i + 31, t.clay, 512, 0.45), 512]),
    ["pat-paper", paperSvg(t), 128],
    // Each texture twice: as drawn, and twice as large for close zoom, so woods never turn to wallpaper.
    ...[...COVERS, "mountains"].flatMap((k): [string, string, number][] => [
      [`cover-${k}`, coverSvg(k, t, themeName), 128],
      [`cover-${k}-lg`, coverSvg(k, t, themeName), 256],
    ]),
    ["line-range", rangePatternSvg(t), 192],
    ["line-wall", wallPatternSvg(t), 128],
    ["line-trail", trailPatternSvg(t), 48],
  ];
  if (t.modern) {
    entries.push(
      // Key events carry their glyph; the many lesser events are plain dots in the same colour.
      ...EVENT_TYPES.map((k): [string, string, number] => [`event-${k}`, modernEventSvg(k, t.events[k], t.ring), 128]),
      ...EVENT_TYPES.map((k): [string, string, number] => [`dot-${k}`, dotSvg(t.events[k], t.ring), 64]),
      ["capital", capitalDotSvg(t.capital, t.ring), 64],
      ["dot-city", dotSvg(t.labelMuted, t.ring, 4.5), 32],
    );
  }
  const imgs = await Promise.all(entries.map(([, svg, size]) => svgToImage(svg, size)));
  return Object.fromEntries(entries.map(([name], i) => [name, imgs[i]]));
}

// --- Style --------------------------------------------------------------------

const paletteExpr = (t: MapTheme) => ["match", ["get", "ci"], ...t.palette.flatMap((c, i) => [i, c]), t.palette[0]];
/** Fades a layer in between two zooms, so textures don't turn to noise when zoomed out. */
const fadeIn = (from: number, to: number, max = 1) =>
  ["interpolate", ["linear"], ["zoom"], from, 0, to, max] as maplibregl.ExpressionSpecification;

const TERRAIN_TINT: Record<string, Record<(typeof TERRAIN_KINDS)[number], string>> = {
  night: { desert: "#3a3326", mountains: "#2c2a2a", plateau: "#2d2b24", tundra: "#22303a", wetland: "#1f3029" },
  survey: { desert: "#efe2bf", mountains: "#e3d9c6", plateau: "#ebe3cc", tundra: "#e4eaea", wetland: "#dfe8d6" },
  clay: { desert: "#e6c98f", mountains: "#c9b08a", plateau: "#d6bd92", tundra: "#d7d3c4", wetland: "#b9bf8c" },
  atlas: { desert: "#efe5cf", mountains: "#e9e5dc", plateau: "#ece5d6", tundra: "#e8edee", wetland: "#e1eadc" },
  "atlas-dark": { desert: "#2e2b24", mountains: "#272a2c", plateau: "#2b2a25", tundra: "#243039", wetland: "#1f2d28" },
};

/** Farmland in two tones, ripe and green, so neighbouring plots read as different crops. */
const FIELD_TINT: Record<string, [string, string]> = {
  night: ["#6b5f3e", "#3f5240"],
  survey: ["#dcc78e", "#b3c193"],
  clay: ["#d9b46a", "#a7ad6a"],
  atlas: ["#e2d6ae", "#c9d4ad"],
  "atlas-dark": ["#47412c", "#2f3d2c"],
};

/** Cities in three tiers of prominence, the best known appearing first. */
function cityLayer(tier: number, minzoom: number, minLinks: number, fonts: Lettering): maplibregl.LayerSpecification {
  const t = currentTheme();
  const upper = tier === 1 ? Infinity : tier === 2 ? 200 : 100;
  return {
    id: `cities-${tier}`,
    type: "symbol",
    source: "cities",
    minzoom,
    filter: ["all", [">=", ["get", "links"], minLinks], ["<", ["get", "links"], upper === Infinity ? 1e9 : upper]],
    layout: {
      // A ring from afar; up close, a little townscape of its region and era.
      "icon-image": ["step", ["zoom"], ["case", ["get", "ancient"], "scn-city-ruin", "scn-city"], 6.5, ["case", ["get", "ancient"], "scn-city-ruin", ["concat", "scn-", ["get", "town"], ["case", [">", ["get", "v"], 0], ["concat", "~", ["to-string", ["get", "v"]]], ""]]]],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 2.2, 0.12, 6.49, 0.2, 6.5, 0.42, 9, 0.9],
      "icon-anchor": ["step", ["zoom"], "center", 6.5, "bottom"],
      "text-field": ["get", "name"],
      "text-font": fonts.regular,
      "text-size": ["interpolate", ["linear"], ["zoom"], 2.2, tier === 1 ? 10.5 : 9.5, 7, tier === 1 ? 14 : 12],
      "text-anchor": ["step", ["zoom"], "left", 6.5, "top"],
      "text-offset": ["step", ["zoom"], ["literal", [0.7, 0]], 6.5, ["literal", [0, 0.3]]],
      "text-optional": true,
      "symbol-sort-key": ["-", 0, ["get", "links"]],
      "icon-padding": 1,
    },
    paint: {
      "text-color": t.label,
      "text-halo-color": t.halo,
      "text-halo-width": 1.2,
      "icon-opacity": fadeIn(minzoom, minzoom + 0.4),
      "text-opacity": fadeIn(minzoom, minzoom + 0.4),
    },
  };
}

/** The image for a scenery feature, choosing its hand-varied version (property v). */
const sceneryImage = ["concat", "scn-", ["get", "k"], ["case", [">", ["coalesce", ["get", "v"], 0], 0], ["concat", "~", ["to-string", ["get", "v"]]], ""]] as maplibregl.ExpressionSpecification;

function sceneryLayer(tier: 1 | 2 | 3 | 4): maplibregl.LayerSpecification {
  return {
    id: `scenery-${tier}`,
    type: "symbol",
    source: "scenery",
    minzoom: SCENERY_MINZOOM[tier],
    filter: ["all", ["==", ["get", "type"], "point"], ["==", ["get", "t"], tier]],
    layout: {
      "icon-image": sceneryImage,
      // Images are 192px at pixel ratio 2: 96 CSS px at size 1. Each piece has its
      // own scale (s) and grows nearly as fast as the ground does when you zoom,
      // so the drawing reads as painted on the land rather than pinned over it.
      "icon-size": ["interpolate", ["exponential", 1.5], ["zoom"], 1.9, ["*", 0.2, ["get", "s"]], 4.6, ["*", 0.34, ["get", "s"]], 7, ["*", 0.58, ["get", "s"]], 9, ["*", 0.85, ["get", "s"]]],
      // Painted, not placed: scenery never hides, never shuffles, and never
      // blocks a label (it sits underneath, in a quiet ink).
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-anchor": "bottom",
    },
    // Fade in on arrival; ease back a little up close, so labels stay the clearest thing.
    paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], SCENERY_MINZOOM[tier], 0, SCENERY_MINZOOM[tier] + 0.5, 0.9, Math.max(6, SCENERY_MINZOOM[tier] + 0.6), 0.9, 8, 0.7] },
  };
}

function reliefLayer(t: MapTheme): maplibregl.LayerSpecification {
  return {
    id: "relief",
    type: "hillshade",
    source: "relief",
    paint: {
      "hillshade-exaggeration": t.relief.exaggeration,
      "hillshade-shadow-color": t.relief.shadow,
      "hillshade-highlight-color": t.relief.highlight,
      "hillshade-accent-color": t.relief.accent,
      "hillshade-illumination-anchor": "map",
      // Igor's method shades slopes cleanly without flattening the plains, as in print atlases.
      ...(t.modern ? { "hillshade-method": "igor" as const } : {}),
    },
  };
}

/** Illustrated layers that the modern Atlas theme hides; the code that updates them keeps working. */
const ILLUSTRATED = new Set([
  "land-texture", "terrain-texture", "cover-texture", "mountain-texture", "coast-ink-retrace", "polity-edge", "polity-paper",
  "polity-line-retrace", "murals", "ranges", "great-wall", "roads", "scenery-1", "scenery-2", "scenery-3", "scenery-4",
  "travellers", "villages", "inhabitants",
]);

/**
 * Turns the illustrated style into a modern reference atlas: pen drawings and
 * textures hidden, hairline borders, dot markers, landmarks as photographs.
 */
function modernize(layers: maplibregl.LayerSpecification[], t: MapTheme): maplibregl.LayerSpecification[] {
  return layers.map((l) => {
    const layer = { ...l, layout: { ...(l.layout ?? {}) }, paint: { ...(l.paint ?? {}) } } as Record<string, any>;
    if (ILLUSTRATED.has(l.id)) layer.layout.visibility = "none";
    switch (l.id) {
      case "coast-ink":
        layer.paint["line-color"] = t.coast.color;
        layer.paint["line-opacity"] = 0.9;
        layer.paint["line-width"] = ["interpolate", ["linear"], ["zoom"], 1, 0.4, 6, 0.9];
        break;
      case "polity-line":
        layer.paint["line-width"] = ["interpolate", ["linear"], ["zoom"], 1, 0.35, 5, 0.9, 8, 1.4];
        break;
      case "cover-tint":
        layer.paint["fill-opacity"] = 0.42;
        break;
      case "cover-margin":
        layer.paint["line-opacity"] = 0.35;
        break;
      case "routes-land":
        delete layer.paint["line-pattern"];
        layer.paint["line-color"] = t.labelMuted;
        layer.paint["line-width"] = ["interpolate", ["linear"], ["zoom"], 1, 0.6, 5, 1.2];
        layer.paint["line-dasharray"] = [3, 2];
        layer.paint["line-opacity"] = 0.55;
        break;
      case "routes-sea":
        layer.paint["line-opacity"] = 0.45;
        break;
      case "capitals":
        layer.layout["icon-image"] = "capital";
        layer.layout["icon-size"] = ["interpolate", ["linear"], ["zoom"], 3, 0.42, 7, 0.6];
        break;
      case "cities-1":
      case "cities-2":
      case "cities-3":
        layer.layout["icon-image"] = "dot-city";
        layer.layout["icon-size"] = ["interpolate", ["linear"], ["zoom"], 2.2, 0.55, 7, 0.8];
        layer.layout["icon-anchor"] = "center";
        layer.layout["text-anchor"] = "left";
        layer.layout["text-offset"] = ["literal", [0.6, 0]];
        break;
      case "events-more":
        // Lesser events wait until you're closer, and keep their distance, so
        // the map never turns to confetti; the best covered win any collision.
        layer.minzoom = 3.8;
        layer.layout["icon-image"] = ["concat", "dot-", ["get", "type"]];
        layer.layout["icon-size"] = ["interpolate", ["linear"], ["zoom"], 3.8, 0.42, 7, 0.55];
        layer.layout["icon-padding"] = 9;
        layer.paint["icon-opacity"] = fadeIn(3.8, 4.3, 0.9);
        break;
      case "events-key":
        // 128px glyph markers at pixel ratio 2: 64 CSS px at size 1.
        layer.layout["icon-size"] = ["interpolate", ["linear"], ["zoom"], 1, 0.36, 6, 0.5];
        break;
      case "drawings-1":
      case "drawings-2":
      case "drawings-3": {
        // A round photograph of the place, where one exists; otherwise its drawing.
        layer.layout["icon-image"] = ["case", ["get", "photo"], ["concat", "photo-", ["get", "id"]], ["concat", "draw-", ["get", "kind"]]];
        // The pin's point marks the place, so the city or capital beneath stays visible.
        layer.layout["icon-anchor"] = "bottom";
        // 128px medallions at pixel ratio 2: 64 CSS px at size 1.
        layer.layout["icon-size"] = ["interpolate", ["linear"], ["zoom"], 1.4, ["*", 0.36, ["get", "s"]], 4, ["*", 0.6, ["get", "s"]], 7, ["*", 0.92, ["get", "s"]], 9, ["*", 1.2, ["get", "s"]]];
        // The great landmarks always show; lesser ones give way rather than pile up.
        layer.layout["icon-allow-overlap"] = l.id === "drawings-1";
        layer.layout["icon-padding"] = 4;
        layer.layout["text-offset"] = [0, 0.3];
        layer.layout["text-anchor"] = "top";
        layer.layout["text-size"] = 11.5;
        break;
      }
    }
    return layer as maplibregl.LayerSpecification;
  });
}

function terrainColor(tint: Record<string, string>, t: MapTheme, themeName: string, green: boolean): maplibregl.ExpressionSpecification {
  const normal = ["match", ["get", "kind"], ...TERRAIN_KINDS.flatMap((k) => [k, tint[k]]), t.land];
  if (!green) return normal as maplibregl.ExpressionSpecification;
  return ["case", ["has", "green"], SAVANNA[themeName as keyof typeof SAVANNA] ?? SAVANNA.night, normal] as unknown as maplibregl.ExpressionSpecification;
}

/** Green-Sahara deserts swap their stipple for grass tufts. */
const terrainPattern = (green: boolean) =>
  (green
    ? ["case", ["has", "green"], "pat-wetland", ["concat", "pat-", ["get", "kind"]]]
    : ["concat", "pat-", ["get", "kind"]]) as maplibregl.ExpressionSpecification;

function styleFor(land: GeoJSON.FeatureCollection, t: MapTheme, themeName: string, era: LetteringEra): maplibregl.StyleSpecification {
  const tint = TERRAIN_TINT[themeName] ?? TERRAIN_TINT.night;
  const dark = themeName === "night" || themeName === "atlas-dark";
  const fonts = LETTERING[era];
  const coverColor = ["match", ["get", "cover"], ...COVERS.flatMap((k) => [k, (COVER_TINT[themeName] ?? COVER_TINT.night)[k]]), "#888"] as unknown as maplibregl.ExpressionSpecification;
  const physical = (layer: string) => ["==", ["get", "layer"], layer] as maplibregl.FilterSpecification;

  const drawingLayer = (tier: 1 | 2 | 3): maplibregl.LayerSpecification => ({
    id: `drawings-${tier}`,
    type: "symbol",
    source: "drawings",
    minzoom: TIER_MINZOOM[tier],
    filter: ["==", ["get", "tier"], tier],
    layout: {
      "icon-image": ["concat", "draw-", ["get", "kind"]],
      // 256px images at pixel ratio 2: 128 CSS px at size 1. Landmarks grow as you
      // approach, until the great ones dominate their surroundings.
      "icon-size": ["interpolate", ["exponential", 1.6], ["zoom"], 1.4, ["*", 0.2, ["get", "s"]], 4, ["*", 0.32, ["get", "s"]], 6, ["*", 0.6, ["get", "s"]], 8.5, ["*", 1.2, ["get", "s"]]],
      "icon-allow-overlap": true,
      "icon-anchor": "bottom",
      "text-field": ["step", ["zoom"], "", 4.6, ["get", "name"]],
      "text-font": fonts.italic,
      "text-size": 11,
      "text-anchor": "top",
      "text-offset": [0, 0.2],
      "text-max-width": 9,
      "text-optional": true,
    },
    paint: {
      "icon-opacity": fadeIn(TIER_MINZOOM[tier], TIER_MINZOOM[tier] + 0.4),
      "text-color": t.label,
      "text-halo-color": t.halo,
      "text-halo-width": 1.2,
    },
  });

  return {
    version: 8,
    glyphs: GLYPHS,
    "font-faces": FONT_FACES,
    projection: { type: "globe" },
    sky: t.sky,
    sources: {
      land: { type: "geojson", data: land },
      physical: { type: "geojson", data: import.meta.env.BASE_URL + "data/physical.json" },
      borders: { type: "geojson", data: EMPTY },
      labels: { type: "geojson", data: EMPTY },
      capitals: { type: "geojson", data: EMPTY },
      events: { type: "geojson", data: EMPTY },
      drawings: { type: "geojson", data: EMPTY },
      surveyor: { type: "geojson", data: EMPTY },
      "borders-prev": { type: "geojson", data: EMPTY },
      scenery: { type: "geojson", data: EMPTY },
      admin1: { type: "geojson", data: EMPTY },
      "admin1-labels": { type: "geojson", data: EMPTY },
      cities: { type: "geojson", data: EMPTY },
      "scenery-year": { type: "geojson", data: EMPTY },
      landcover: { type: "geojson", data: import.meta.env.BASE_URL + "data/landcover.json" },
      relief: {
        type: "raster-dem",
        tiles: [RELIEF_TILES],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 10,
        attribution: 'Relief: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen terrain tiles</a>',
      },
    },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": t.ocean } },
      // Water lining (survey) or coastal glow (night), widest ring first.
      ...t.coast.widths
        .map((w, i) => ({
          id: `coast-${i}`,
          type: "line" as const,
          source: "land",
          paint: {
            "line-color": t.coast.color,
            "line-width": ["interpolate", ["linear"], ["zoom"], 1, w * 0.6, 5, w * 1.6],
            "line-opacity": t.coast.opacities[i],
            "line-blur": t.coast.blur,
          },
        }))
        .reverse(),
      { id: "land", type: "fill", source: "land", paint: { "fill-color": t.land } },
      { id: "land-texture", type: "fill", source: "land", paint: { "fill-pattern": "pat-land", "fill-opacity": fadeIn(2, 3.5) } },
      {
        id: "terrain-tint",
        type: "fill",
        source: "physical",
        filter: physical("terrain"),
        paint: { "fill-color": terrainColor(tint, t, themeName, false), "fill-opacity": 0.9 },
      },
      {
        id: "terrain-texture",
        type: "fill",
        source: "physical",
        filter: physical("terrain"),
        paint: { "fill-pattern": terrainPattern(false), "fill-opacity": fadeIn(1.8, 3.2) },
      },
      { id: "ice", type: "fill", source: "physical", filter: physical("ice"), paint: { "fill-color": dark ? "#c9d6df" : "#ffffff", "fill-opacity": dark ? 0.35 : 0.9 } },
      { id: "lakes", type: "fill", source: "physical", filter: physical("lake"), paint: { "fill-color": t.ocean } },
      {
        id: "rivers",
        type: "line",
        source: "physical",
        filter: physical("river"),
        minzoom: 1.8,
        paint: {
          "line-color": t.coast.color,
          "line-opacity": fadeIn(1.8, 3, themeName === "survey" ? 0.75 : 0.5),
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, ["case", ["<=", ["get", "rank"], 3], 0.8, 0.4], 6, ["case", ["<=", ["get", "rank"], 3], 2, 1]],
        },
      },
      // Relief sits under the territories in Night and Survey, a quiet texture;
      // in Clay it sits on top, so every territory looks modelled by hand.
      ...(t.clay ? [] : [reliefLayer(t)]),
      {
        id: "polity-fill",
        type: "fill",
        source: "borders",
        paint: {
          "fill-color": paletteExpr(t) as maplibregl.ExpressionSpecification,
          "fill-opacity": ["case", ["==", ["get", "precision"], 1], t.fillOpacityApprox, t.fillOpacity],
        },
      },
      {
        id: "coast-ink",
        type: "line",
        source: "land",
        layout: { "line-join": "round" },
        paint: { "line-color": t.label, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 6, 1.2], "line-opacity": dark ? 0.35 : 0.6 },
      },
      {
        id: "coast-ink-retrace",
        type: "line",
        source: "land",
        layout: { "line-join": "round" },
        paint: {
          "line-color": t.label,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.3, 6, 0.7],
          "line-opacity": dark ? 0.18 : 0.3,
          "line-offset": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 6, 2.2],
        },
      },
      {
        // Watercolour pooling: each wash darkens along its edge, bleeding a
        // little into its neighbour, as paint does on paper.
        id: "polity-edge",
        type: "line",
        source: "borders",
        layout: { "line-join": "round" },
        paint: {
          "line-color": paletteExpr(t) as maplibregl.ExpressionSpecification,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.5, 4, 5, 7, 10],
          "line-blur": ["interpolate", ["linear"], ["zoom"], 1, 1, 4, 3.5, 7, 7],
          "line-opacity": t.clay ? 0.35 : 0.75,
        },
      },
      {
        id: "polity-paper",
        type: "fill",
        source: "borders",
        paint: { "fill-pattern": "pat-paper", "fill-opacity": t.clay ? 0.5 : themeName === "survey" ? 0.55 : 0.85 },
      },
      // --- Land cover: woods, rainforest and grassland painted as areas, with
      // a soft darker margin, so the land reads as one continuous picture. ---
      {
        id: "cover-tint",
        type: "fill",
        source: "landcover",
        paint: {
          "fill-color": coverColor,
          "fill-opacity": t.clay ? 0.35 : dark ? 0.45 : 0.32,
        },
      },
      {
        id: "cover-margin",
        type: "line",
        source: "landcover",
        filter: ["in", ["get", "cover"], ["literal", ["broadleaf", "conifer", "jungle"]]],
        layout: { "line-join": "round" },
        paint: {
          "line-color": coverColor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1, 4, 3, 7, 6],
          "line-blur": ["interpolate", ["linear"], ["zoom"], 1, 1, 4, 2.5, 7, 5],
          "line-opacity": 0.5,
        },
      },
      {
        id: "cover-texture",
        type: "fill",
        source: "landcover",
        minzoom: 2.2,
        paint: {
          "fill-pattern": ["step", ["zoom"], ["concat", "cover-", ["get", "cover"]], 6, ["concat", "cover-", ["get", "cover"], "-lg"]],
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 2.2, 0, 3.4, ["case", ["==", ["get", "cover"], "farmland"], 0.75, 1]],
        },
      },
      {
        id: "mountain-texture",
        type: "fill",
        source: "physical",
        filter: ["all", physical("terrain"), ["==", ["get", "kind"], "mountains"]],
        minzoom: 2.2,
        paint: { "fill-pattern": ["step", ["zoom"], "cover-mountains", 6, "cover-mountains-lg"], "fill-opacity": fadeIn(2.2, 3.4) },
      },
      {
        // The previous year's territories, faded out over the new ones when
        // the year changes, so borders seem to melt into their next shape.
        id: "polity-fill-prev",
        type: "fill",
        source: "borders-prev",
        paint: {
          "fill-color": paletteExpr(t) as maplibregl.ExpressionSpecification,
          "fill-opacity": 0,
          "fill-opacity-transition": { duration: CROSSFADE_MS, delay: 0 },
        },
      },
      ...(t.clay
        ? [
            { id: "clay-grain", type: "fill" as const, source: "borders", paint: { "fill-pattern": "pat-clay", "fill-opacity": fadeIn(2.5, 4) } },
            reliefLayer(t),
            // Two offset lines either side of each border read as a pressed seam.
            { id: "clay-seam-light", type: "line" as const, source: "borders", paint: { "line-color": "rgba(255, 244, 222, 0.55)", "line-width": 1.2, "line-offset": -1.1, "line-blur": 0.6 } },
            { id: "clay-seam-dark", type: "line" as const, source: "borders", paint: { "line-color": "rgba(60, 32, 14, 0.35)", "line-width": 1.4, "line-offset": 1.2, "line-blur": 0.8 } },
          ]
        : []),
      {
        id: "polity-line",
        type: "line",
        source: "borders",
        paint: {
          "line-color": t.border,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 5, 1.1],
          // Dashed outlines signal approximate borders.
          "line-dasharray": ["case", ["==", ["get", "precision"], 1], ["literal", [2, 2]], ["literal", [1, 0]]],
        },
      },
      {
        // Invisible fill so states can be hovered and clicked.
        id: "admin1-fill",
        type: "fill",
        source: "admin1",
        minzoom: 3,
        filter: ["<=", ["get", "from"], 99999],
        paint: { "fill-color": "#000", "fill-opacity": 0 },
      },
      {
        id: "admin1-line",
        type: "line",
        source: "admin1",
        minzoom: 2.6,
        filter: ["<=", ["get", "from"], 99999],
        layout: { "line-join": "round" },
        paint: {
          "line-color": t.labelMuted,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2.6, 0.3, 6, 0.9],
          "line-opacity": fadeIn(2.6, 3.4, 0.7),
          "line-dasharray": [3, 2],
        },
      },
      {
        id: "admin1-hover",
        type: "line",
        source: "admin1",
        filter: ["==", ["get", "name"], ""],
        paint: { "line-color": t.hover, "line-width": 1.2, "line-opacity": 0.7 },
      },
      {
        id: "polity-line-retrace",
        type: "line",
        source: "borders",
        layout: { "line-join": "round" },
        paint: {
          "line-color": t.border,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.25, 5, 0.6],
          "line-opacity": 0.45,
          "line-offset": ["interpolate", ["linear"], ["zoom"], 1, 0.6, 6, 1.8],
        },
      },
      {
        id: "polity-hover",
        type: "line",
        source: "borders",
        filter: ["==", ["get", "name"], ""],
        paint: { "line-color": t.hover, "line-width": 1.4, "line-opacity": 0.8 },
      },
      {
        id: "polity-selected-glow",
        type: "line",
        source: "borders",
        filter: ["==", ["get", "name"], ""],
        paint: { "line-color": t.accent, "line-width": 9, "line-blur": 7, "line-opacity": 0.55 },
      },
      {
        id: "polity-selected",
        type: "line",
        source: "borders",
        filter: ["==", ["get", "name"], ""],
        paint: { "line-color": t.accent, "line-width": 2 },
      },
      // --- The illustrated layer: murals, ranges, routes, scenery. Kept beneath
      // labels and placed around them, so the map stays readable. ---
      {
        id: "murals",
        type: "symbol",
        source: "scenery",
        filter: ["==", ["get", "type"], "mural"],
        layout: {
          "icon-image": ["concat", "mural-", ["get", "k"]],
          // Sized in degrees of longitude, so a mural spans the same region at every zoom.
          // The image is 512px at pixel ratio 2, so 256 CSS px wide at size 1.
          "icon-size": ["interpolate", ["exponential", 2], ["zoom"], 0, ["*", ["get", "deg"], 512 / 360 / 256], 8, ["*", ["get", "deg"], (512 * 256) / 360 / 256]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-pitch-alignment": "map",
        },
        paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 1, t.muralOpacity, 2.8, t.muralOpacity * 0.75, 4, t.muralOpacity * 0.3, 4.8, 0] },
      },
      {
        // Mountain ranges: a chain of upright peak drawings along each spine.
        id: "ranges",
        type: "symbol",
        source: "scenery",
        // From afar; closer in, the mountains' own texture takes over.
        maxzoom: 4.2,
        filter: ["==", ["get", "type"], "range"],
        layout: {
          "symbol-placement": "line",
          // Closer than a peak is wide, so neighbours overlap into one ridge.
          "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 1, 9, 4, 16, 7, 29],
          "icon-image": "scn-peaks",
          "icon-size": ["interpolate", ["exponential", 1.4], ["zoom"], 1, 0.17, 4, 0.3, 7, 0.55],
          "icon-rotation-alignment": "viewport",
          "icon-allow-overlap": true,
          "icon-padding": 0,
        },
        paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 3.4, 0.95, 4.2, 0] },
      },
      {
        // The Great Wall, drawn continuously along its course.
        id: "great-wall",
        type: "line",
        source: "scenery",
        filter: ["==", ["get", "type"], "wall"],
        layout: { "line-join": "round" },
        paint: { "line-pattern": "line-wall", "line-width": ["interpolate", ["linear"], ["zoom"], 1, 3, 4, 7, 7, 14] },
      },
      {
        id: "routes-land",
        type: "line",
        source: "scenery",
        filter: ["all", ["==", ["get", "type"], "route"], ["==", ["get", "mode"], "land"]],
        layout: { "line-join": "round" },
        paint: { "line-pattern": "line-trail", "line-width": ["interpolate", ["linear"], ["zoom"], 1, 3, 5, 7], "line-opacity": 0.85 },
      },
      {
        id: "routes-sea",
        type: "line",
        source: "scenery",
        filter: ["all", ["==", ["get", "type"], "route"], ["!=", ["get", "mode"], "land"]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": t.coast.color,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 5, 1.6],
          "line-opacity": themeName === "survey" ? 0.8 : 0.6,
          "line-dasharray": ["case", ["==", ["get", "mode"], "air"], ["literal", [6, 4]], ["literal", [0.5, 3]]],
        },
      },
      {
        id: "roads",
        type: "line",
        source: "scenery-year",
        minzoom: 3.2,
        filter: ["has", "road"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": t.labelMuted,
          "line-width": ["interpolate", ["linear"], ["zoom"], 3.2, 0.9, 7, 1.8],
          "line-opacity": fadeIn(3.2, 3.8, 0.8),
          "line-dasharray": [1, 1.8],
        },
      },
      sceneryLayer(4),
      sceneryLayer(3),
      sceneryLayer(2),
      sceneryLayer(1),
      {
        id: "travellers",
        type: "symbol",
        source: "scenery",
        minzoom: 2.4,
        filter: ["==", ["get", "type"], "traveller"],
        layout: {
          "icon-image": sceneryImage,
          "icon-size": ["interpolate", ["exponential", 1.5], ["zoom"], 2.4, 0.26, 6, 0.55, 9, 1.1],
          "icon-padding": 1,
        },
        paint: { "icon-opacity": fadeIn(2.4, 3) },
      },
      {
        // Villages: a small inked ring where the roads meet, as on a county map.
        id: "villages",
        type: "circle",
        source: "scenery-year",
        minzoom: 3.4,
        filter: ["all", ["has", "village"], ["==", ["geometry-type"], "Point"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3.4, 1, 7, 2.6, 9, 3.5],
          "circle-color": t.land,
          "circle-stroke-color": t.labelMuted,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3.4, 0.6, 7, 1.1],
          "circle-opacity": fadeIn(3.4, 3.9),
          "circle-stroke-opacity": fadeIn(3.4, 3.9, 0.9),
          "circle-pitch-alignment": "map",
        },
      },
      {
        id: "inhabitants",
        type: "symbol",
        source: "scenery-year",
        minzoom: 2.6,
        filter: ["all", ["!", ["has", "village"]], ["!", ["has", "road"]]],
        layout: {
          "icon-image": sceneryImage,
          "icon-size": ["interpolate", ["exponential", 1.5], ["zoom"], 2.6, 0.27, 6, 0.55, 9, 1.05],
          "icon-padding": 1,
          "symbol-sort-key": ["get", "t"],
        },
        paint: { "icon-opacity": fadeIn(2.6, 3.1) },
      },
      // --- Drawings: never hidden by labels, never hiding them. ---
      drawingLayer(1),
      drawingLayer(2),
      drawingLayer(3),
      {
        id: "surveyor",
        type: "symbol",
        source: "surveyor",
        minzoom: SURVEYOR_MINZOOM,
        layout: {
          "icon-image": "draw-surveyor",
          "icon-size": ["interpolate", ["linear"], ["zoom"], SURVEYOR_MINZOOM, 0.3, 7, 0.55],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "bottom",
        },
      },
      // --- Labels and markers. Placement priority runs top layer first. ---
      {
        id: "sea-label",
        type: "symbol",
        source: "physical",
        filter: ["all", physical("sea-label"), ["==", ["get", "kind"], "ocean"]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": fonts.italic,
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 13, 5, 20],
          "text-letter-spacing": 0.4,
          "text-max-width": 8,
        },
        paint: { "text-color": t.coast.color, "text-opacity": themeName === "survey" ? 0.95 : 0.7, "text-halo-color": t.ocean, "text-halo-width": 1 },
      },
      {
        id: "sea-label-minor",
        type: "symbol",
        source: "physical",
        minzoom: 2.4,
        filter: ["all", physical("sea-label"), ["!=", ["get", "kind"], "ocean"], ["<=", ["get", "minzoom"], 4]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": fonts.italic,
          "text-size": ["interpolate", ["linear"], ["zoom"], 2.4, 10, 6, 14],
          "text-letter-spacing": 0.15,
          "text-max-width": 8,
        },
        paint: { "text-color": t.coast.color, "text-opacity": fadeIn(2.4, 3, themeName === "survey" ? 0.95 : 0.7), "text-halo-color": t.ocean, "text-halo-width": 1 },
      },
      {
        id: "land-label",
        type: "symbol",
        source: "physical",
        minzoom: 2.8,
        filter: ["all", physical("land-label"), ["<=", ["get", "minzoom"], 4]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": fonts.italic,
          "text-size": ["interpolate", ["linear"], ["zoom"], 2.8, 9, 6, 13],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.22,
          "text-max-width": 9,
          "symbol-sort-key": ["get", "rank"],
        },
        paint: { "text-color": t.labelMuted, "text-opacity": fadeIn(2.8, 3.3, 0.75), "text-halo-color": t.halo, "text-halo-width": 1 },
      },
      {
        id: "admin1-label",
        type: "symbol",
        source: "admin1-labels",
        minzoom: 3.6,
        filter: ["<=", ["get", "from"], 99999],
        layout: {
          "text-field": ["get", "name"],
          "text-font": fonts.italic,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.14,
          "text-size": ["interpolate", ["linear"], ["zoom"], 3.6, 9, 7, 12.5],
          "text-max-width": 7,
          "symbol-sort-key": ["-", 0, ["get", "km2"]],
          "text-padding": 6,
        },
        paint: { "text-color": t.labelMuted, "text-opacity": fadeIn(3.6, 4.1, 0.85), "text-halo-color": t.halo, "text-halo-width": 1 },
      },
      cityLayer(1, 2.2, 200, fonts),
      cityLayer(2, 3.1, 100, fonts),
      cityLayer(3, 4.0, 0, fonts),
      {
        id: "polity-label-small",
        type: "symbol",
        source: "labels",
        minzoom: 3,
        filter: ["<", ["get", "km2"], MINOR_KM2],
        layout: {
          "text-field": ["get", "name"],
          "text-font": fonts.regular,
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 9.5, 6, 12],
          "text-max-width": 7,
          "symbol-sort-key": ["-", 0, ["get", "km2"]],
          "text-padding": 3,
        },
        paint: { "text-color": t.label, "text-halo-color": t.halo, "text-halo-width": 1.3 },
      },
      {
        id: "polity-label",
        type: "symbol",
        source: "labels",
        filter: ["all", [">=", ["get", "km2"], MINOR_KM2], ["<", ["get", "km2"], MAJOR_KM2]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": fonts.regular,
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9.5, 5, 13.5],
          "text-max-width": 7,
          "symbol-sort-key": ["-", 0, ["get", "km2"]],
          "text-padding": 4,
        },
        paint: { "text-color": t.label, "text-halo-color": t.halo, "text-halo-width": 1.3 },
      },
      {
        id: "capitals",
        type: "symbol",
        source: "capitals",
        minzoom: 3,
        layout: {
          // Up close, a capital's tower becomes a townscape of its region and era.
          "icon-image": ["step", ["zoom"], "capital", 4.4, ["concat", "scn-", ["get", "town"]]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.4, 4.39, 0.5, 4.4, 0.5, 7, 0.75, 9, 1.2],
          "icon-padding": 1,
          "symbol-sort-key": ["-", 0, ["get", "rank"]],
          "text-field": ["step", ["zoom"], "", 3.8, ["get", "name"]],
          "text-font": fonts.italic,
          "text-size": 11,
          "text-offset": [0, 0.9],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": t.label, "text-halo-color": t.halo, "text-halo-width": 1.2 },
      },
      {
        // Imported events only appear once you zoom in; collisions keep the
        // most widely covered ones.
        id: "events-more",
        type: "symbol",
        source: "events",
        minzoom: 2.8,
        filter: ["!", ["get", "featured"]],
        layout: {
          "icon-image": ["concat", "event-", ["get", "type"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 2.8, 0.32, 6, 0.48],
          "symbol-sort-key": ["-", 0, ["get", "notability"]],
          "icon-padding": 3,
        },
        paint: { "icon-opacity": fadeIn(2.8, 3.3, 0.82) },
      },
      {
        id: "events-key",
        type: "symbol",
        source: "events",
        filter: ["get", "featured"],
        layout: {
          "icon-image": ["concat", "event-", ["get", "type"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.48, 6, 0.74],
          "icon-allow-overlap": true,
        },
      },
      {
        id: "event-selected",
        type: "circle",
        source: "events",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 13, 6, 18],
          "circle-color": "transparent",
          "circle-stroke-color": t.accent,
          "circle-stroke-width": 2.5,
        },
      },
      {
        // Top layer, so placed first: the big empires keep their names.
        id: "polity-label-major",
        type: "symbol",
        source: "labels",
        filter: [">=", ["get", "km2"], MAJOR_KM2],
        layout: {
          "text-field": ["get", "name"],
          "text-font": fonts.major,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.18,
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, ["step", ["get", "km2"], 10, 5000000, 12], 5, ["step", ["get", "km2"], 16, 5000000, 20]],
          "text-max-width": 9,
          "symbol-sort-key": ["-", 0, ["get", "km2"]],
        },
        paint: { "text-color": t.label, "text-halo-color": t.halo, "text-halo-width": 1.5 },
      },
    ],
  } as maplibregl.StyleSpecification;
}

/** The style for a theme: the illustrated map, or the modern Atlas made from it. */
function themedStyle(land: GeoJSON.FeatureCollection, t: MapTheme, themeName: string, era: LetteringEra): maplibregl.StyleSpecification {
  const style = styleFor(land, t, themeName, era);
  return t.modern ? { ...style, layers: modernize(style.layers, t) } : style;
}

/** Layers whose text font follows the lettering era, and which face each uses. */
const FONT_ROLES: Record<string, keyof Lettering> = {
  "sea-label": "italic",
  "sea-label-minor": "italic",
  "land-label": "italic",
  "polity-label-small": "regular",
  "admin1-label": "italic",
  "cities-1": "regular",
  "cities-2": "regular",
  "cities-3": "regular",
  "polity-label": "regular",
  capitals: "italic",
  "drawings-1": "italic",
  "drawings-2": "italic",
  "drawings-3": "italic",
  "polity-label-major": "major",
};

const INTERACTIVE = ["surveyor", "drawings-3", "drawings-2", "drawings-1", "events-key", "events-more", "travellers", "inhabitants", "capitals",
  "cities-1", "cities-2", "cities-3", "admin1-fill", "polity-fill"];

/** How the figures for each way of life are described on hover. */
const WAY_OF_LIFE: Record<string, string> = {
  hunter: "Hunters and gatherers",
  fisher: "Fishing communities",
  herder: "Herders and their flocks",
  rider: "Mounted herders of the steppe",
  farmer: "Farming communities",
};

// --- Map ----------------------------------------------------------------------

export interface YearLayers {
  data: YearData;
  featured: HistoryEvent[];
  more: HistoryEvent[];
  drawings: Drawing[];
  surveyor: SurveyorSpot | null;
  /** Static scenery features that belong to this era. */
  scenery: GeoJSON.Feature[];
  /** Cities that existed in this era, named as they were then. */
  cities: GeoJSON.Feature[];
}

export class AtlasMap {
  readonly map: maplibregl.Map;
  private ready: Promise<void>;
  private tooltip = document.getElementById("tooltip")!;
  private readonly secondary: boolean;
  private images: Record<string, HTMLImageElement>;
  private last: YearLayers | null = null;
  private era: LetteringEra = "modern";
  private selection: { polity: string | null; event: string | null } = { polity: null, event: null };
  private globe = true;
  private admin1: Admin1Data | null = null;
  private green = false;
  /** Borders currently on screen, for the cross-fade to the next year. */
  private shown: YearData | null = null;

  static async create(container: string, land: GeoJSON.FeatureCollection, handlers: MapHandlers, options: MapOptions = {}) {
    return new AtlasMap(container, land, handlers, options, await themeImages(currentTheme()));
  }

  private constructor(
    container: string,
    private land: GeoJSON.FeatureCollection,
    private handlers: MapHandlers,
    options: MapOptions,
    images: Record<string, HTMLImageElement>,
  ) {
    this.secondary = options.secondary ?? false;
    this.images = images;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.map = new maplibregl.Map({
      container,
      center: [20, 30],
      zoom: window.innerWidth > 800 ? 2 : 1.2,
      minZoom: 0.6,
      maxZoom: 9,
      attributionControl: false,
      fadeDuration: reduceMotion ? 0 : 200,
      style: themedStyle(land, currentTheme(), document.documentElement.dataset.theme ?? "night", this.era),
    });
    // Images are pre-rendered, so they can be supplied synchronously on demand.
    this.map.setMissingStyleImageResolver((id: string) => {
      const img = this.images[id];
      if (img && !this.map.hasImage(id)) this.map.addImage(id, img, { pixelRatio: 2 });
      else if (id.startsWith("photo-") && !this.map.hasImage(id)) this.loadPhoto(id);
    });

    if (!this.secondary) this.addControls();

    this.ready = new Promise((resolve) => this.map.once("load", () => resolve()));
    this.bindInteractions();
    window.addEventListener("atlas-theme", () => this.applyTheme());
    window.addEventListener("resize", () => this.updatePadding());
    this.updatePadding();
  }

  /**
   * Photographs load only when a landmark comes into view: a blank placeholder
   * now, swapped for the photo medallion once it arrives.
   */
  private loadPhoto(id: string) {
    const blank = new ImageData(MEDALLION_PX, MEDALLION_PX);
    this.map.addImage(id, blank, { pixelRatio: 2 });
    const src = drawingImage(id.slice("photo-".length))?.thumb;
    if (!src) return;
    medallion(src)
      .then((data) => {
        if (this.map.hasImage(id)) this.map.updateImage(id, data);
      })
      .catch(() => {
        /* the drawing's placeholder stays blank; the label still shows */
      });
  }

  private addControls() {
    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    this.map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: [
        'Borders: <a href="https://github.com/aourednik/historical-basemaps">historical-basemaps</a> (GPL-3.0)',
        'Geography: <a href="https://www.naturalearthdata.com/">Natural Earth</a>',
        'Capitals &amp; events: <a href="https://www.wikidata.org/">Wikidata</a>',
      ],
    }), "bottom-left");
  }

  /** Rebuilds the style for the new theme, then restores data and selection. */
  private async applyTheme() {
    const t = currentTheme();
    this.images = await themeImages(t);
    for (const id of Object.keys(this.images)) if (this.map.hasImage(id)) this.map.removeImage(id);
    this.map.setStyle(themedStyle(this.land, t, document.documentElement.dataset.theme ?? "night", this.era), { diff: false });
    this.green = false; // the new style starts with the ordinary desert colours
    this.shown = null;
    this.map.once("style.load", () => {
      if (!this.globe) this.map.setProjection({ type: "mercator" });
      if (this.last) this.setYear(this.last);
      if (this.admin1) this.setAdmin1(this.admin1);
      this.highlight(this.selection.polity, this.selection.event);
    });
  }

  /** Keeps the globe centred in the area the side panel leaves visible. */
  private updatePadding() {
    const comparing = document.body.classList.contains("comparing");
    const overlapsPanel = !this.secondary && window.innerWidth > 800 && !comparing;
    // On phones the details sheet peeks up over the lower part of the map.
    const sheet = !this.secondary && window.innerWidth <= 800 && !comparing ? Math.round(this.map.getContainer().clientHeight * 0.4) : 0;
    this.map.setPadding({ top: 0, bottom: sheet, left: 0, right: overlapsPanel ? 404 : 0 });
  }

  /** Call after the container changes size (entering or leaving compare mode). */
  resize() {
    this.map.resize();
    this.updatePadding();
  }

  jumpTo(other: AtlasMap) {
    const m = other.map;
    this.map.jumpTo({ center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() });
  }

  /** Mirrors camera movement between this map and another, in both directions. */
  syncWith(other: AtlasMap) {
    let syncing = false;
    const mirror = (from: AtlasMap, to: AtlasMap) => () => {
      if (syncing) return;
      syncing = true;
      to.jumpTo(from);
      syncing = false;
    };
    this.map.on("move", mirror(this, other));
    other.map.on("move", mirror(other, this));
  }

  private bindInteractions() {
    const m = this.map;
    // Pick by INTERACTIVE priority, not draw order, so small hidden things win
    // over the territory or marker they sit on. A little padding makes the
    // Surveyor and drawings easier to hit.
    const query = (point: maplibregl.Point) => {
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [[point.x - 4, point.y - 4], [point.x + 4, point.y + 4]];
      const hits = m.queryRenderedFeatures(box, { layers: INTERACTIVE.filter((id) => m.getLayer(id)) });
      return hits.sort((x, y) => INTERACTIVE.indexOf(x.layer.id) - INTERACTIVE.indexOf(y.layer.id))[0];
    };

    m.on("mousemove", (e: maplibregl.MapMouseEvent) => {
      const f = query(e.point);
      m.getCanvas().style.cursor = f ? "pointer" : "";
      if (!f || f.layer.id !== "admin1-fill") m.setFilter("admin1-hover", ["==", ["get", "name"], ""]);
      if (!f) {
        this.tooltip.hidden = true;
        m.setFilter("polity-hover", ["==", ["get", "name"], ""]);
        return;
      }
      this.showTooltip(f, e.point);
    });
    m.on("mouseout", () => (this.tooltip.hidden = true));

    m.on("click", (e: maplibregl.MapMouseEvent) => {
      const f = query(e.point);
      if (!f) return;
      const id = f.layer.id;
      if (id === "surveyor") this.handlers.onSurveyorClick();
      else if (id.startsWith("drawings-")) this.handlers.onDrawingClick(f.properties.id);
      else if (id.startsWith("events-")) this.handlers.onEventClick(f.properties.id);
      else if (id === "travellers") this.handlers.onRouteClick(f.properties.route);
      else if (id === "inhabitants") this.handlers.onPolityClick(f.properties.of);
      else if (id.startsWith("cities-")) this.handlers.onCityClick(f.properties.qid);
      else if (id === "admin1-fill") this.handlers.onAdminClick(f.properties.name, f.properties.country);
      else if (id === "capitals") this.handlers.onPolityClick(f.properties.of);
      else this.handlers.onPolityClick(f.properties.name);
    });
  }

  private showTooltip(f: MapGeoJSONFeature, point: maplibregl.Point) {
    const p = f.properties;
    const id = f.layer.id;
    let text: string;
    let hover = "";
    if (id === "surveyor") text = "You found the Surveyor!\nClick to see what they're looking at";
    else if (id.startsWith("drawings-")) text = `${p.name}\n${p.quip}`;
    else if (id.startsWith("events-")) text = p.title;
    else if (id === "travellers") text = `${p.route}\n${formatYear(p.from)} – ${p.to === null || p.to === undefined ? "today" : formatYear(p.to)}`;
    else if (id.startsWith("cities-")) text = f.properties.name;
    else if (id === "admin1-fill") {
      text = `${p.name}\n${p.kind} of ${p.country}`;
      this.map.setFilter("admin1-hover", ["all", ["==", ["get", "name"], p.name], ["==", ["get", "country"], p.country]]);
    } else if (id === "inhabitants") {
      text = `${WAY_OF_LIFE[p.k] ?? "People"}\n${p.of}`;
      hover = p.of;
    }
    else if (id === "capitals") {
      text = `${p.name}\nCapital of ${p.of}`;
      hover = p.of;
    } else {
      text = p.sovereign && p.sovereign !== p.name ? `${p.name}\nRuled by ${p.sovereign}` : p.name;
      hover = p.name;
    }
    this.map.setFilter("polity-hover", ["==", ["get", "name"], hover]);
    this.tooltip.textContent = text;
    this.tooltip.hidden = false;
    // Keep the tooltip on screen near the right edge.
    const flip = point.x > window.innerWidth - 300;
    this.tooltip.style.transform = `translate(${flip ? point.x - 280 : point.x + 14}px, ${point.y + 14}px)`;
  }

  async setYear(layers: YearLayers) {
    this.last = layers;
    // Landmark photos are looked up by id, so the image index must be in first.
    await Promise.all([this.ready, loadImages()]);
    const { data, featured, more, drawings, surveyor } = layers;

    const era = letteringEra(data.year);
    if (era !== this.era) {
      this.era = era;
      for (const [layer, role] of Object.entries(FONT_ROLES)) {
        if (this.map.getLayer(layer)) this.map.setLayoutProperty(layer, "text-font", LETTERING[era][role]);
      }
    }

    const green = isGreenSahara(data.year);
    if (green !== this.green) {
      this.green = green;
      const themeName = document.documentElement.dataset.theme ?? "night";
      this.map.setPaintProperty("terrain-tint", "fill-color", terrainColor(TERRAIN_TINT[themeName] ?? TERRAIN_TINT.night, currentTheme(), themeName, green));
      this.map.setPaintProperty("terrain-texture", "fill-pattern", terrainPattern(green));
    }

    const src = (id: string) => this.map.getSource(id) as GeoJSONSource;
    const previous = this.shown;
    this.shown = data;
    if (previous && previous !== data && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Show last year's map on top at full strength, then let it dissolve.
      src("borders-prev").setData(previous.borders);
      this.map.setPaintProperty("polity-fill-prev", "fill-opacity-transition", { duration: 0, delay: 0 });
      this.map.setPaintProperty("polity-fill-prev", "fill-opacity", currentTheme().fillOpacity);
      requestAnimationFrame(() => {
        this.map.setPaintProperty("polity-fill-prev", "fill-opacity-transition", { duration: CROSSFADE_MS, delay: 60 });
        this.map.setPaintProperty("polity-fill-prev", "fill-opacity", 0);
      });
    }
    src("borders").setData(data.borders);
    src("labels").setData(data.labels);
    src("capitals").setData(data.capitals);
    src("events").setData({
      type: "FeatureCollection",
      features: [...more, ...featured].map((e) => ({
        type: "Feature",
        properties: { id: e.id, title: e.title, type: e.type, featured: !e.source, notability: e.notability ?? 0 },
        geometry: { type: "Point", coordinates: [e.lon, e.lat] },
      })),
    });
    src("scenery").setData({ type: "FeatureCollection", features: layers.scenery });
    src("cities").setData({ type: "FeatureCollection", features: layers.cities });
    // States and provinces appear from the year they were created.
    for (const id of ["admin1-fill", "admin1-line", "admin1-label"]) this.map.setFilter(id, ["<=", ["get", "from"], data.year]);
    // Farmland spreads as farming does; wild cover is always there.
    for (const id of ["cover-tint", "cover-texture"]) this.map.setFilter(id, ["<=", ["get", "from"], data.year]);
    src("scenery-year").setData(data.scenery ?? EMPTY);
    src("drawings").setData({
      type: "FeatureCollection",
      features: drawings.map((d) => ({
        type: "Feature",
        properties: { id: d.id, name: d.name, kind: d.kind, tier: d.tier, quip: d.quip, photo: !!drawingImage(d.id), s: d.size ?? (d.tier === 1 ? 1.35 : d.tier === 2 ? 1.05 : 0.85) },
        geometry: { type: "Point", coordinates: [d.lon, d.lat] },
      })),
    });
    src("surveyor").setData({
      type: "FeatureCollection",
      features: surveyor ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [surveyor.lon, surveyor.lat] } }] : [],
    });
  }

  async highlight(polity: string | null, eventId: string | null) {
    this.selection = { polity, event: eventId };
    await this.ready;
    for (const id of ["polity-selected", "polity-selected-glow"]) this.map.setFilter(id, ["==", ["get", "name"], polity ?? ""]);
    this.map.setFilter("event-selected", ["==", ["get", "id"], eventId ?? ""]);
  }

  private get motion() {
    return matchMedia("(prefers-reduced-motion: reduce)").matches ? { animate: false } : { duration: 1200 };
  }

  fitFeature(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
    const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    let [w, s, e, n] = [180, 90, -180, -90];
    for (const rings of polys)
      for (const [x, y] of rings[0]) {
        w = Math.min(w, x); e = Math.max(e, x);
        s = Math.min(s, y); n = Math.max(n, y);
      }
    const padding = { top: 60, bottom: 60, left: 40, right: 40 };
    this.map.fitBounds([[w, s], [e, n]], { padding, maxZoom: 6, ...this.motion });
  }

  flyToPoint(lon: number, lat: number, zoom = 3.5) {
    this.map.flyTo({ center: [lon, lat], zoom: Math.max(this.map.getZoom(), zoom), ...this.motion });
  }

  /** States and provinces load separately, once, after the first map is drawn. */
  async setAdmin1(admin: Admin1Data) {
    this.admin1 = admin;
    await this.ready;
    (this.map.getSource("admin1") as GeoJSONSource).setData(admin.shapes);
    (this.map.getSource("admin1-labels") as GeoJSONSource).setData(admin.labels);
  }

  setGlobe(globe: boolean) {
    this.globe = globe;
    this.map.setProjection({ type: globe ? "globe" : "mercator" });
  }
}
