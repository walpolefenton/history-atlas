import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre finds its worker relative to its own module, which breaks once
// bundled; point it at the emitted worker file explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { HistoryEvent, YearData } from "./types";
import { EVENT_TYPES } from "./format";

maplibregl.setWorkerUrl(workerUrl);

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

export interface MapHandlers {
  onPolityClick(name: string): void;
  onEventClick(id: string): void;
  onBackgroundClick(): void;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export class AtlasMap {
  readonly map: maplibregl.Map;
  private ready: Promise<void>;
  private tooltip = document.getElementById("tooltip")!;

  constructor(container: string, land: GeoJSON.FeatureCollection, private handlers: MapHandlers) {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.map = new maplibregl.Map({
      container,
      center: [20, 30],
      zoom: window.innerWidth > 800 ? 2 : 1.2,
      minZoom: 0.6,
      maxZoom: 9,
      attributionControl: false,
      fadeDuration: reduceMotion ? 0 : 200,
      style: {
        version: 8,
        glyphs: GLYPHS,
        projection: { type: "globe" },
        sources: {
          land: { type: "geojson", data: land },
          borders: { type: "geojson", data: EMPTY },
          labels: { type: "geojson", data: EMPTY },
          capitals: { type: "geojson", data: EMPTY },
          events: { type: "geojson", data: EMPTY },
        },
        layers: [
          { id: "ocean", type: "background", paint: { "background-color": cssVar("--map-ocean") } },
          { id: "land", type: "fill", source: "land", paint: { "fill-color": cssVar("--map-land") } },
          {
            id: "polity-fill",
            type: "fill",
            source: "borders",
            paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": ["case", ["==", ["get", "precision"], 1], 0.4, 0.6],
            },
          },
          {
            id: "polity-line",
            type: "line",
            source: "borders",
            paint: {
              "line-color": cssVar("--map-border"),
              "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 5, 1.2],
              // Dashed outlines signal approximate borders.
              "line-dasharray": ["case", ["==", ["get", "precision"], 1], ["literal", [2, 2]], ["literal", [1, 0]]],
            },
          },
          {
            id: "polity-hover",
            type: "line",
            source: "borders",
            filter: ["==", ["get", "name"], ""],
            paint: { "line-color": cssVar("--map-hover"), "line-width": 1.5 },
          },
          {
            id: "polity-selected",
            type: "line",
            source: "borders",
            filter: ["==", ["get", "name"], ""],
            paint: { "line-color": cssVar("--map-selected"), "line-width": 2.5 },
          },
          {
            id: "polity-label",
            type: "symbol",
            source: "labels",
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Semibold"],
              "text-size": [
                "interpolate", ["linear"], ["zoom"],
                1, ["step", ["get", "km2"], 8, 300000, 9, 1500000, 11, 5000000, 13],
                5, ["step", ["get", "km2"], 11, 300000, 13, 1500000, 15, 5000000, 17],
              ],
              "text-max-width": 7,
              "text-letter-spacing": 0.04,
              "symbol-sort-key": ["-", 0, ["get", "km2"]],
              "text-padding": 4,
            },
            paint: {
              "text-color": cssVar("--map-label"),
              "text-halo-color": cssVar("--map-label-halo"),
              "text-halo-width": 1.4,
            },
          },
          {
            id: "capital-dot",
            type: "circle",
            source: "capitals",
            minzoom: 2.2,
            paint: {
              "circle-radius": 3,
              "circle-color": cssVar("--map-capital"),
              "circle-stroke-color": cssVar("--map-label-halo"),
              "circle-stroke-width": 1.2,
            },
          },
          {
            id: "capital-label",
            type: "symbol",
            source: "capitals",
            minzoom: 3.2,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Noto Sans Italic"],
              "text-size": 11,
              "text-offset": [0, 0.9],
              "text-anchor": "top",
              "text-optional": true,
            },
            paint: { "text-color": cssVar("--map-label"), "text-halo-color": cssVar("--map-label-halo"), "text-halo-width": 1.2 },
          },
          {
            id: "event-dot",
            type: "circle",
            source: "events",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 5, 6, 8],
              "circle-color": ["match", ["get", "type"], ...Object.entries(EVENT_TYPES).flatMap(([k, v]) => [k, v.color]), "#888"],
              "circle-stroke-color": cssVar("--map-label-halo"),
              "circle-stroke-width": 2,
            },
          },
          {
            id: "event-selected",
            type: "circle",
            source: "events",
            filter: ["==", ["get", "id"], ""],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 10, 6, 14],
              "circle-color": "transparent",
              "circle-stroke-color": cssVar("--map-selected"),
              "circle-stroke-width": 2.5,
            },
          },
        ],
      } as maplibregl.StyleSpecification,
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    this.map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: [
        'Borders: <a href="https://github.com/aourednik/historical-basemaps">historical-basemaps</a> (GPL-3.0)',
        'Coastlines: <a href="https://www.naturalearthdata.com/">Natural Earth</a>',
        'Capitals: <a href="https://www.wikidata.org/">Wikidata</a>',
      ],
    }), "bottom-left");

    // Keep the globe centred in the area the side panel leaves visible.
    const pad = () => this.map.setPadding(window.innerWidth > 800 ? { top: 0, bottom: 0, left: 0, right: 404 } : { top: 0, bottom: 0, left: 0, right: 0 });
    pad();
    window.addEventListener("resize", pad);

    this.ready = new Promise((resolve) => this.map.once("load", () => resolve()));
    this.bindInteractions();
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => this.applyTheme());
  }

  private bindInteractions() {
    const m = this.map;
    const interactive = ["event-dot", "polity-fill"];

    m.on("mousemove", (e: maplibregl.MapMouseEvent) => {
      const f = m.queryRenderedFeatures(e.point, { layers: interactive })[0];
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
      const f = m.queryRenderedFeatures(e.point, { layers: interactive })[0];
      if (!f) return this.handlers.onBackgroundClick();
      if (f.layer.id === "event-dot") this.handlers.onEventClick(f.properties.id);
      else this.handlers.onPolityClick(f.properties.name);
    });
  }

  private showTooltip(f: MapGeoJSONFeature, point: maplibregl.Point) {
    const p = f.properties;
    let text: string;
    if (f.layer.id === "event-dot") {
      text = p.title;
      this.map.setFilter("polity-hover", ["==", ["get", "name"], ""]);
    } else {
      text = p.sovereign && p.sovereign !== p.name ? `${p.name}\n${p.sovereign}` : p.name;
      this.map.setFilter("polity-hover", ["==", ["get", "name"], p.name]);
    }
    this.tooltip.textContent = text;
    this.tooltip.hidden = false;
    this.tooltip.style.transform = `translate(${point.x + 14}px, ${point.y + 14}px)`;
  }

  private applyTheme() {
    const m = this.map;
    m.setPaintProperty("ocean", "background-color", cssVar("--map-ocean"));
    m.setPaintProperty("land", "fill-color", cssVar("--map-land"));
    m.setPaintProperty("polity-line", "line-color", cssVar("--map-border"));
    m.setPaintProperty("polity-hover", "line-color", cssVar("--map-hover"));
    m.setPaintProperty("polity-selected", "line-color", cssVar("--map-selected"));
    m.setPaintProperty("event-selected", "circle-stroke-color", cssVar("--map-selected"));
    for (const id of ["polity-label", "capital-label"]) {
      m.setPaintProperty(id, "text-color", cssVar("--map-label"));
      m.setPaintProperty(id, "text-halo-color", cssVar("--map-label-halo"));
    }
    m.setPaintProperty("capital-dot", "circle-color", cssVar("--map-capital"));
    for (const id of ["capital-dot", "event-dot"]) m.setPaintProperty(id, "circle-stroke-color", cssVar("--map-label-halo"));
  }

  async setYear(data: YearData, events: HistoryEvent[]) {
    await this.ready;
    (this.map.getSource("borders") as GeoJSONSource).setData(data.borders);
    (this.map.getSource("labels") as GeoJSONSource).setData(data.labels);
    (this.map.getSource("capitals") as GeoJSONSource).setData(data.capitals);
    (this.map.getSource("events") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: events.map((e) => ({
        type: "Feature",
        properties: { id: e.id, title: e.title, type: e.type },
        geometry: { type: "Point", coordinates: [e.lon, e.lat] },
      })),
    });
  }

  async highlight(polity: string | null, eventId: string | null) {
    await this.ready;
    this.map.setFilter("polity-selected", ["==", ["get", "name"], polity ?? ""]);
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
    this.map.setProjection({ type: globe ? "globe" : "mercator" });
  }
}
