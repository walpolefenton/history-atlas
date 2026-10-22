import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre finds its worker relative to its own module, which breaks once
// bundled; point it at the emitted worker file explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { EventType, HistoryEvent, YearData } from "./types";
import { currentTheme, type MapTheme } from "./theme";
import { capitalIconSvg, eventIconSvg, svgToImage } from "./icons";

maplibregl.setWorkerUrl(workerUrl);

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
// Labels render from self-hosted font files (see scripts/fetch-fonts.mjs).
// The glyph server only fills in characters those files lack.
const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
const FONT_URL = new URL(import.meta.env.BASE_URL + "fonts/", location.href).href;
const FONT_FACES = {
  "Spectral Regular": FONT_URL + "Spectral-Regular.ttf",
  "Spectral Italic": FONT_URL + "Spectral-Italic.ttf",
  "Spectral Medium": FONT_URL + "Spectral-Medium.ttf",
};
const SERIF = ["Spectral Regular"];
const SERIF_ITALIC = ["Spectral Italic"];
const SERIF_MEDIUM = ["Spectral Medium"];
/** Territories at least this large get spaced capital-letter labels, like a printed atlas. */
const MAJOR_KM2 = 1_500_000;
const EVENT_TYPES: EventType[] = ["conflict", "diplomacy", "political", "culture", "exploration", "crisis"];
const TERRAIN_KINDS = ["desert", "mountains", "plateau", "tundra", "wetland"] as const;

export interface MapHandlers {
  onPolityClick(name: string): void;
  onEventClick(id: string): void;
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
    default: // wetland: tufts of reeds
      return svg(`<path d="M6 14 V10 M8 14 V8 M10 14 V10 M22 29 V25 M24 29 V23 M26 29 V25" stroke="${ink}0.34)" stroke-width="1.2" stroke-linecap="round"/>`);
  }
}

async function themeImages(t: MapTheme): Promise<Record<string, HTMLImageElement>> {
  const entries: [string, string][] = [
    ...EVENT_TYPES.map((k) => [`event-${k}`, eventIconSvg(k, t.events[k], t.ring)] as [string, string]),
    ["capital", capitalIconSvg(t.capital, t.ring)],
    ["pat-land", patternSvg("land", t)],
    ...TERRAIN_KINDS.map((k) => [`pat-${k}`, patternSvg(k, t)] as [string, string]),
  ];
  const imgs = await Promise.all(entries.map(([, svg]) => svgToImage(svg, svg.includes('width="32"') ? 32 : 64)));
  return Object.fromEntries(entries.map(([name], i) => [name, imgs[i]]));
}

// --- Style --------------------------------------------------------------------

const paletteExpr = (t: MapTheme) => ["match", ["get", "ci"], ...t.palette.flatMap((c, i) => [i, c]), t.palette[0]];

const TERRAIN_TINT: Record<string, Record<(typeof TERRAIN_KINDS)[number], string>> = {
  night: { desert: "#3a3326", mountains: "#2c2a2a", plateau: "#2d2b24", tundra: "#22303a", wetland: "#1f3029" },
  survey: { desert: "#efe2bf", mountains: "#e3d9c6", plateau: "#ebe3cc", tundra: "#e4eaea", wetland: "#dfe8d6" },
};

function styleFor(land: GeoJSON.FeatureCollection, t: MapTheme, themeName: string): maplibregl.StyleSpecification {
  const tint = TERRAIN_TINT[themeName] ?? TERRAIN_TINT.night;
  const physical = (layer: string) => ["==", ["get", "layer"], layer] as maplibregl.FilterSpecification;
  const zoomSize = (a: number, b: number) => ["interpolate", ["linear"], ["zoom"], 1, a, 6, b];

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
      { id: "land-texture", type: "fill", source: "land", paint: { "fill-pattern": "pat-land" } },
      {
        id: "terrain-tint",
        type: "fill",
        source: "physical",
        filter: physical("terrain"),
        paint: { "fill-color": ["match", ["get", "kind"], ...TERRAIN_KINDS.flatMap((k) => [k, tint[k]]), t.land], "fill-opacity": 0.9 },
      },
      {
        id: "terrain-texture",
        type: "fill",
        source: "physical",
        filter: physical("terrain"),
        paint: { "fill-pattern": ["concat", "pat-", ["get", "kind"]] },
      },
      { id: "ice", type: "fill", source: "physical", filter: physical("ice"), paint: { "fill-color": themeName === "survey" ? "#ffffff" : "#c9d6df", "fill-opacity": themeName === "survey" ? 0.9 : 0.35 } },
      { id: "lakes", type: "fill", source: "physical", filter: physical("lake"), paint: { "fill-color": t.ocean } },
      {
        id: "rivers",
        type: "line",
        source: "physical",
        filter: physical("river"),
        minzoom: 1.5,
        paint: {
          "line-color": t.coast.color,
          "line-opacity": themeName === "survey" ? 0.7 : 0.45,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, ["case", ["<=", ["get", "rank"], 3], 0.8, 0.4], 6, ["case", ["<=", ["get", "rank"], 3], 2, 1]],
        },
      },
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
      // --- Labels and markers. Placement priority runs top layer first. ---
      {
        id: "sea-label",
        type: "symbol",
        source: "physical",
        filter: ["all", physical("sea-label"), ["<=", ["get", "minzoom"], 3]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": SERIF_ITALIC,
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, ["match", ["get", "kind"], "ocean", 13, 9.5], 5, ["match", ["get", "kind"], "ocean", 20, 14]],
          "text-letter-spacing": ["match", ["get", "kind"], "ocean", 0.4, 0.15],
          "text-max-width": 8,
        },
        paint: { "text-color": t.coast.color, "text-opacity": themeName === "survey" ? 0.95 : 0.7, "text-halo-color": t.ocean, "text-halo-width": 1 },
      },
      {
        id: "land-label",
        type: "symbol",
        source: "physical",
        minzoom: 1.8,
        filter: ["all", physical("land-label"), ["<=", ["get", "minzoom"], 4]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": SERIF_ITALIC,
          "text-size": zoomSize(8.5, 13),
          "text-transform": "uppercase",
          "text-letter-spacing": 0.22,
          "text-max-width": 9,
          "symbol-sort-key": ["get", "rank"],
        },
        paint: { "text-color": t.labelMuted, "text-opacity": 0.75, "text-halo-color": t.halo, "text-halo-width": 1 },
      },
      {
        id: "polity-label",
        type: "symbol",
        source: "labels",
        filter: ["<", ["get", "km2"], MAJOR_KM2],
        layout: {
          "text-field": ["get", "name"],
          "text-font": SERIF,
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            1, ["step", ["get", "km2"], 8, 300000, 9.5],
            5, ["step", ["get", "km2"], 11, 300000, 13.5],
          ],
          "text-max-width": 7,
          "symbol-sort-key": ["-", 0, ["get", "km2"]],
          "text-padding": 3,
        },
        paint: { "text-color": t.label, "text-halo-color": t.halo, "text-halo-width": 1.3 },
      },
      {
        id: "capitals",
        type: "symbol",
        source: "capitals",
        minzoom: 2.4,
        layout: {
          "icon-image": "capital",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 2.4, 0.36, 6, 0.6],
          "icon-padding": 1,
          "symbol-sort-key": ["-", 0, ["get", "rank"]],
          "text-field": ["step", ["zoom"], "", 3.6, ["get", "name"]],
          "text-font": SERIF_ITALIC,
          "text-size": 11,
          "text-offset": [0, 0.9],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: { "text-color": t.label, "text-halo-color": t.halo, "text-halo-width": 1.2 },
      },
      {
        id: "events",
        type: "symbol",
        source: "events",
        layout: {
          "icon-image": ["concat", "event-", ["get", "type"]],
          // Key events larger; collisions hide less notable ones until you zoom in.
          "icon-size": ["interpolate", ["linear"], ["zoom"], 1, ["case", ["get", "featured"], 0.42, 0.27], 6, ["case", ["get", "featured"], 0.72, 0.52]],
          "symbol-sort-key": ["case", ["get", "featured"], -1e6, ["-", 0, ["get", "notability"]]],
          "icon-padding": 2,
        },
      },
      {
        id: "event-selected",
        type: "circle",
        source: "events",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 11, 6, 17],
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
          "text-font": SERIF_MEDIUM,
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

// --- Map ----------------------------------------------------------------------

export class AtlasMap {
  readonly map: maplibregl.Map;
  private ready: Promise<void>;
  private tooltip = document.getElementById("tooltip")!;
  private readonly secondary: boolean;
  private images: Record<string, HTMLImageElement>;
  private lastData: { data: YearData; featured: HistoryEvent[]; more: HistoryEvent[] } | null = null;
  private selection: { polity: string | null; event: string | null } = { polity: null, event: null };
  private globe = true;

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
      style: styleFor(land, currentTheme(), document.documentElement.dataset.theme ?? "night"),
    });
    // Images are pre-rendered, so they can be supplied synchronously on demand.
    this.map.setMissingStyleImageResolver((id: string) => {
      const img = this.images[id];
      if (img && !this.map.hasImage(id)) this.map.addImage(id, img, { pixelRatio: 2 });
    });

    if (!this.secondary) this.addControls();

    this.ready = new Promise((resolve) => this.map.once("load", () => resolve()));
    this.bindInteractions();
    window.addEventListener("atlas-theme", () => this.applyTheme());
    window.addEventListener("resize", () => this.updatePadding());
    this.updatePadding();
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
    this.map.setStyle(styleFor(this.land, t, document.documentElement.dataset.theme ?? "night"), { diff: false });
    this.map.once("style.load", () => {
      if (!this.globe) this.map.setProjection({ type: "mercator" });
      if (this.lastData) this.setYear(this.lastData.data, this.lastData.featured, this.lastData.more);
      this.highlight(this.selection.polity, this.selection.event);
    });
  }

  /** Keeps the globe centred in the area the side panel leaves visible. */
  private updatePadding() {
    const overlapsPanel = !this.secondary && window.innerWidth > 800 && !document.body.classList.contains("comparing");
    this.map.setPadding({ top: 0, bottom: 0, left: 0, right: overlapsPanel ? 404 : 0 });
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
    const interactive = ["events", "capitals", "polity-fill"];
    const query = (point: maplibregl.Point) => m.queryRenderedFeatures(point, { layers: interactive.filter((id) => m.getLayer(id)) })[0];

    m.on("mousemove", (e: maplibregl.MapMouseEvent) => {
      const f = query(e.point);
      m.getCanvas().style.cursor = f ? "pointer" : "";
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
      if (f.layer.id === "events") this.handlers.onEventClick(f.properties.id);
      else if (f.layer.id === "capitals") this.handlers.onPolityClick(f.properties.of);
      else this.handlers.onPolityClick(f.properties.name);
    });
  }

  private showTooltip(f: MapGeoJSONFeature, point: maplibregl.Point) {
    const p = f.properties;
    let text: string;
    let hover = "";
    if (f.layer.id === "events") text = p.title;
    else if (f.layer.id === "capitals") {
      text = `${p.name}\nCapital of ${p.of}`;
      hover = p.of;
    } else {
      text = p.sovereign && p.sovereign !== p.name ? `${p.name}\nRuled by ${p.sovereign}` : p.name;
      hover = p.name;
    }
    this.map.setFilter("polity-hover", ["==", ["get", "name"], hover]);
    this.tooltip.textContent = text;
    this.tooltip.hidden = false;
    this.tooltip.style.transform = `translate(${point.x + 14}px, ${point.y + 14}px)`;
  }

  async setYear(data: YearData, featured: HistoryEvent[], more: HistoryEvent[]) {
    this.lastData = { data, featured, more };
    await this.ready;
    (this.map.getSource("borders") as GeoJSONSource).setData(data.borders);
    (this.map.getSource("labels") as GeoJSONSource).setData(data.labels);
    (this.map.getSource("capitals") as GeoJSONSource).setData(data.capitals);
    (this.map.getSource("events") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [...more, ...featured].map((e) => ({
        type: "Feature",
        properties: { id: e.id, title: e.title, type: e.type, featured: !e.source, notability: e.notability ?? 0 },
        geometry: { type: "Point", coordinates: [e.lon, e.lat] },
      })),
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

  flyToPoint(lon: number, lat: number) {
    this.map.flyTo({ center: [lon, lat], zoom: Math.max(this.map.getZoom(), 3.5), ...this.motion });
  }

  setGlobe(globe: boolean) {
    this.globe = globe;
    this.map.setProjection({ type: globe ? "globe" : "mercator" });
  }
}
