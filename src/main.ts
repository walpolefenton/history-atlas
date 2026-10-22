import "./style.css";
import { AtlasMap, letteringEra, type YearLayers } from "./map";
import { citiesForEra, drawingsForEra, eventsForEra, loadAdmin1, loadCities, loadDrawings, loadEvents, loadLand, loadMeta, loadScenery, loadSurveyor, loadWikidataEvents, loadYear, sceneryForEra } from "./data";
import { formatYear } from "./format";
import { initPanel, renderAdmin, renderCity, renderCompare, renderDrawing, renderEvent, renderList, renderOverview, renderPolity, renderRoute, renderSurveyor, type PanelContext } from "./panel";
import { initSearch } from "./search";
import type { Admin1Data, City, Drawing, EventType, HistoryEvent, Meta, RouteInfo, Selection, SurveyorSpot, YearData } from "./types";
import { applyTheme, loadThemeChoice, saveThemeChoice, type ThemeChoice } from "./theme";

const TICK_YEARS = [-10000, -3000, -1000, -1, 500, 1000, 1500, 1800, 1914, 2010];
/** The subset still labelled on narrow screens. */
const COMPACT_TICKS = [-3000, 500, 1500, 2010];
const PLAY_INTERVAL_MS = 1800;
/** Broad eras shown as a ribbon under the timeline; each starts at the given year. */
const ERAS = [
  { name: "Prehistory", from: -Infinity },
  { name: "Antiquity", from: -3000 },
  { name: "Middle Ages", from: 500 },
  { name: "Early modern", from: 1500 },
  { name: "Modern", from: 1800 },
];
const THEME_LABEL: Record<ThemeChoice, string> = { auto: "Auto", night: "Night", survey: "Survey", clay: "Clay" };
const THEME_ORDER: ThemeChoice[] = ["night", "survey", "clay", "auto"];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const FOUND_KEY = "atlas-surveyor-found";
function loadFound(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FOUND_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveFound(found: Set<number>) {
  try {
    localStorage.setItem(FOUND_KEY, JSON.stringify([...found]));
  } catch {
    /* progress just won't persist */
  }
}

interface Era {
  data: YearData;
  next: number | null;
  /** Hand-curated events, shown first. */
  key: HistoryEvent[];
  /** Imported Wikidata events, most widely covered first. */
  more: HistoryEvent[];
  drawings: Drawing[];
  surveyor: SurveyorSpot | null;
  scenery: GeoJSON.Feature[];
  cities: GeoJSON.Feature[];
}

class App {
  private index = 0;
  private data!: YearData;
  private selection: Selection = { kind: "none" };
  private playTimer: number | null = null;
  private loadToken = 0;
  private slider = $<HTMLInputElement>("year-slider");
  private hiddenTypes = new Set<EventType>();
  private wdEvents: HistoryEvent[] = [];
  /** The illustrated layer, loaded after the first map is on screen. */
  private scenery: GeoJSON.Feature[] = [];
  private cities: City[] = [];
  private admin1: Admin1Data | null = null;
  /** Event requested by URL before the Wikidata events had loaded. */
  private pendingEvent: string | null = null;
  /** Snapshot years in which this viewer has found the Surveyor. */
  private found = loadFound();

  // Compare mode: a second map showing another snapshot, camera-synced.
  private compareIndex: number | null = null;
  private compareData: YearData | null = null;
  private atlasB: AtlasMap | null = null;

  constructor(
    private meta: Meta,
    private curated: HistoryEvent[],
    private atlas: AtlasMap,
    private land: GeoJSON.FeatureCollection,
    private drawings: Drawing[],
    private spots: Record<string, SurveyorSpot>,
  ) {}

  private get years() {
    return this.meta.years.map((y) => y.year);
  }

  private get allEvents() {
    return this.curated.concat(this.wdEvents);
  }

  setCities(cities: City[]) {
    this.cities = cities;
    if (this.data) this.refresh();
  }

  setAdmin1(admin: Admin1Data) {
    this.admin1 = admin;
    this.atlas.setAdmin1(admin);
    this.atlasB?.setAdmin1(admin);
  }

  setScenery(features: GeoJSON.Feature[]) {
    this.scenery = features;
    if (this.data) this.refresh();
  }

  /** Adds the large Wikidata event set once it has loaded in the background. */
  setWikidataEvents(events: HistoryEvent[]) {
    this.wdEvents = events;
    if (!this.data) return;
    this.refresh();
    if (this.pendingEvent) this.selectEvent(this.pendingEvent, true);
    this.pendingEvent = null;
  }

  private era(i: number, data: YearData): Era {
    const next = this.meta.years[i + 1]?.year ?? null;
    const visible = (e: HistoryEvent) => !this.hiddenTypes.has(e.type);
    return {
      data,
      next,
      key: eventsForEra(this.curated, data.year, next).filter(visible),
      more: eventsForEra(this.wdEvents, data.year, next)
        .filter(visible)
        .sort((a, b) => (b.notability ?? 0) - (a.notability ?? 0)),
      drawings: drawingsForEra(this.drawings, data.year, next),
      surveyor: this.spots[String(data.year)] ?? null,
      scenery: sceneryForEra(this.scenery, data.year, next),
      // Capitals are drawn already, as towers and townscapes; don't mark them twice.
      cities: citiesForEra(this.cities, data.year, new Set(data.capitals.features.map((f) => f.properties.qid))),
    };
  }

  private layers(era: Era): YearLayers {
    return { data: era.data, featured: era.key, more: era.more, drawings: era.drawings, surveyor: era.surveyor, scenery: era.scenery, cities: era.cities };
  }

  private context(): PanelContext {
    const era = this.era(this.index, this.data);
    return {
      meta: this.meta,
      data: this.data,
      nextYear: era.next,
      eraEvents: era.key,
      moreEvents: era.more,
      drawings: era.drawings,
      surveyor: { spot: era.surveyor, found: this.found.has(this.data.year), count: this.found.size, total: Object.keys(this.spots).length },
      hiddenTypes: this.hiddenTypes,
      compare: this.compareData,
      actions: {
        selectPolity: (name, year) => this.selectPolity(name, year, true),
        selectEvent: (id) => this.selectEvent(id, true),
        goToYear: (year) => this.setIndex(this.years.indexOf(year)),
        showOverview: () => this.select({ kind: "none" }, true),
        toggleType: (t) => this.toggleType(t),
        setCompareYear: (year) => this.setCompareIndex(this.years.indexOf(year)),
        selectDrawing: (id) => this.selectDrawing(id, true),
        showSurveyor: () => this.select({ kind: "surveyor" }, true),
      },
    };
  }

  async start() {
    this.buildTimeline();
    this.bindControls();
    const s = parseHash(location.hash);
    if (s.selection.kind === "event") {
      const id = s.selection.id;
      if (!this.curated.some((e) => e.id === id)) this.pendingEvent = id;
    }
    const idx = s.year !== undefined ? this.years.indexOf(s.year) : -1;
    await this.setIndex(idx >= 0 ? idx : this.years.indexOf(1914), s.compare !== undefined ? { kind: "none" } : s.selection);
    if (s.compare !== undefined && this.years.includes(s.compare)) await this.openCompare(this.years.indexOf(s.compare));
  }

  // --- Year ------------------------------------------------------------------

  async setIndex(i: number, selection?: Selection) {
    if (i < 0 || i >= this.years.length) return;
    const token = ++this.loadToken;
    this.index = i;
    const year = this.years[i];
    this.slider.value = String(i);
    this.slider.setAttribute("aria-valuetext", formatYear(year));
    $("year-display").textContent = formatYear(year);
    // Thousands separators only for deep prehistory ("10,000"), never for "1914".
    $("ym-num").textContent = Math.abs(year) >= 10000 ? Math.abs(year).toLocaleString("en") : String(Math.abs(year));
    $("ym-era").textContent = year < 0 ? "BCE" : "CE";
    // The year numeral is set in the same lettering as the map labels.
    document.body.dataset.lettering = letteringEra(year);
    for (const b of document.querySelectorAll<HTMLElement>(".era")) b.setAttribute("aria-current", String(b.dataset.from !== undefined && eraOf(year) === b.dataset.name));
    document.body.classList.add("loading");

    const data = await loadYear(year);
    if (token !== this.loadToken) return; // a newer request superseded this one
    this.data = data;
    const era = this.era(i, data);
    await this.atlas.setYear(this.layers(era));
    $("map-a-year").textContent = formatYear(year);
    document.body.classList.remove("loading");

    // Keep the current selection when it still makes sense in the new year.
    let sel = selection ?? this.selection;
    if (sel.kind === "polity") {
      const name = sel.name;
      if (!data.borders.features.some((f) => f.properties.name === name)) sel = { kind: "none" };
    } else if (sel.kind === "event") {
      const id = sel.id;
      if (![...era.key, ...era.more].some((e) => e.id === id)) sel = { kind: "none" };
    } else if (sel.kind === "drawing") {
      const id = sel.id;
      if (!era.drawings.some((d) => d.id === id)) sel = { kind: "none" };
    } else if (sel.kind === "surveyor") sel = { kind: "none" };
    else if (sel.kind === "city") {
      const qid = sel.qid;
      if (!era.cities.some((f) => f.properties?.qid === qid)) sel = { kind: "none" };
    } else if (sel.kind === "admin") {
      const { name, country } = sel;
      const a = this.admin1?.shapes.features.find((f) => f.properties.name === name && f.properties.country === country);
      if (!a || a.properties.from > year) sel = { kind: "none" };
    } else if (sel.kind === "route") {
      const name = sel.name;
      const r = this.route(name);
      if (!r || r.from >= (era.next ?? Infinity) || (r.to !== null && r.to < year)) sel = { kind: "none" };
    }
    if (this.compareIndex !== null && sel.kind === "none") sel = { kind: "compare" };
    this.select(sel, false);

    // Warm the neighbours so stepping through time feels instant.
    for (const j of [i - 1, i + 1]) if (this.years[j] !== undefined) loadYear(this.years[j]).catch(() => {});
  }

  /** Re-applies events and panel after a filter or data change, without reloading borders. */
  private refresh() {
    this.atlas.setYear(this.layers(this.era(this.index, this.data)));
    if (this.atlasB && this.compareData && this.compareIndex !== null) {
      this.atlasB.setYear(this.layers(this.era(this.compareIndex, this.compareData)));
    }
    this.select(this.selection, false);
  }

  private toggleType(t: EventType) {
    if (this.hiddenTypes.has(t)) this.hiddenTypes.delete(t);
    else this.hiddenTypes.add(t);
    this.refresh();
  }

  // --- Compare ---------------------------------------------------------------

  private async openCompare(i: number) {
    this.stopPlay();
    // Show the pane first: MapLibre needs a sized container when it is created.
    document.body.classList.add("comparing");
    if (!this.atlasB) {
      this.atlasB = await AtlasMap.create("map-b", this.land, {
        onPolityClick: (name) => this.selectPolity(name, undefined, false),
        onEventClick: (id) => this.selectEvent(id, false),
        onDrawingClick: (id) => this.selectDrawing(id, false),
        onSurveyorClick: () => {},
        onRouteClick: (name) => this.selectRoute(name),
        onCityClick: (qid) => this.select({ kind: "city", qid }, true),
        onAdminClick: (name, country) => this.select({ kind: "admin", name, country }, true),
      }, { secondary: true });
      this.atlas.syncWith(this.atlasB);
    }
    $("btn-compare").setAttribute("aria-pressed", "true");
    this.atlas.resize();
    this.atlasB.resize();
    this.atlasB.jumpTo(this.atlas);
    await this.setCompareIndex(i);
  }

  private closeCompare() {
    this.compareIndex = null;
    this.compareData = null;
    document.body.classList.remove("comparing");
    $("btn-compare").setAttribute("aria-pressed", "false");
    this.atlas.resize();
    this.select({ kind: "none" }, true);
  }

  private async setCompareIndex(i: number) {
    if (i < 0 || i >= this.years.length || !this.atlasB) return;
    this.compareIndex = i;
    const data = await loadYear(this.years[i]);
    if (this.compareIndex !== i) return;
    this.compareData = data;
    // The comparison map carries no Surveyor: one hiding place per year.
    await this.atlasB.setYear({ ...this.layers(this.era(i, data)), surveyor: null });
    const select = $<HTMLSelectElement>("compare-year");
    select.value = String(this.years[i]);
    const keepPolity = this.selection.kind === "polity" ? this.selection : null;
    this.select(keepPolity ?? { kind: "compare" }, false);
  }

  // --- Selection -------------------------------------------------------------

  private select(sel: Selection, focusPanel: boolean) {
    this.selection = sel;
    const ctx = this.context();
    if (sel.kind === "polity") renderPolity(ctx, sel.name, focusPanel);
    else if (sel.kind === "event") {
      const e = this.allEvents.find((x) => x.id === sel.id);
      if (e) renderEvent(ctx, e, focusPanel);
      else renderOverview(ctx, focusPanel);
    } else if (sel.kind === "list") renderList(ctx, focusPanel);
    else if (sel.kind === "compare" && this.compareData) renderCompare(ctx, focusPanel);
    else if (sel.kind === "drawing") {
      const d = this.drawings.find((x) => x.id === sel.id);
      if (d) renderDrawing(ctx, d, focusPanel);
      else renderOverview(ctx, focusPanel);
    } else if (sel.kind === "surveyor") renderSurveyor(ctx, focusPanel);
    else if (sel.kind === "route") {
      const r = this.route(sel.name);
      if (r) renderRoute(ctx, r, focusPanel);
      else renderOverview(ctx, focusPanel);
    } else if (sel.kind === "city") {
      const c = this.cities.find((x) => x.qid === sel.qid);
      if (c) renderCity(ctx, c, focusPanel);
      else renderOverview(ctx, focusPanel);
    } else if (sel.kind === "admin") {
      const a = this.admin1?.shapes.features.find((f) => f.properties.name === sel.name && f.properties.country === sel.country)?.properties;
      if (a) renderAdmin(ctx, a, focusPanel);
      else renderOverview(ctx, focusPanel);
    }
    else renderOverview(ctx, focusPanel);

    const polity = sel.kind === "polity" ? sel.name : null;
    const event = sel.kind === "event" ? sel.id : null;
    this.atlas.highlight(polity, event);
    this.atlasB?.highlight(polity, event);
    $("btn-list").setAttribute("aria-pressed", String(sel.kind === "list"));
    $("btn-overview").setAttribute("aria-pressed", String(sel.kind === "none"));
    history.replaceState(null, "", toHash(this.data.year, sel, this.compareIndex === null ? null : this.years[this.compareIndex]));
  }

  async selectPolity(name: string, year: number | undefined, fly: boolean) {
    const inB = this.compareData?.borders.features.some((f) => f.properties.name === name) ?? false;
    if (year !== undefined && year !== this.data.year) {
      await this.setIndex(this.years.indexOf(year), { kind: "polity", name });
    } else if (!this.data.borders.features.some((f) => f.properties.name === name) && !inB) {
      // Not on this map (e.g. a sovereign named only as a ruler): jump to the nearest year it appears.
      const ys = this.meta.appearances[name];
      if (!ys?.length) return;
      await this.setIndex(this.years.indexOf(nearest(ys, this.data.year)), { kind: "polity", name });
    } else {
      this.select({ kind: "polity", name }, true);
    }
    if (fly) {
      const f =
        this.data.borders.features.find((x) => x.properties.name === name) ??
        this.compareData?.borders.features.find((x) => x.properties.name === name);
      if (f) this.atlas.fitFeature(f.geometry);
    }
  }

  async selectEvent(id: string, fly: boolean) {
    const e = this.allEvents.find((x) => x.id === id);
    if (!e) return;
    const era = this.era(this.index, this.data);
    if (![...era.key, ...era.more].some((x) => x.id === id)) {
      // Jump to the snapshot whose era contains the event's start.
      this.hiddenTypes.delete(e.type);
      let i = 0;
      while (i + 1 < this.years.length && this.years[i + 1] <= e.start) i++;
      await this.setIndex(i, { kind: "event", id });
    } else {
      this.select({ kind: "event", id }, true);
    }
    if (fly) this.atlas.flyToPoint(e.lon, e.lat);
  }

  async selectDrawing(id: string, fly: boolean) {
    const d = this.drawings.find((x) => x.id === id);
    if (!d) return;
    if (!this.era(this.index, this.data).drawings.some((x) => x.id === id)) {
      // Jump to the snapshot whose era contains the year it was built.
      let i = 0;
      while (i + 1 < this.years.length && this.years[i + 1] <= d.from) i++;
      await this.setIndex(i, { kind: "drawing", id });
    } else {
      this.select({ kind: "drawing", id }, true);
    }
    // Fly in far enough for the drawing's tier to be visible.
    if (fly) this.atlas.flyToPoint(d.lon, d.lat, d.tier === 3 ? 4.2 : d.tier === 2 ? 3.4 : 3);
  }

  private route(name: string): RouteInfo | null {
    const f = this.scenery.find((x) => x.properties?.type === "route" && x.properties.name === name);
    return f ? (f.properties as RouteInfo) : null;
  }

  selectCity(qid: string) {
    this.select({ kind: "city", qid }, true);
  }

  selectAdmin(name: string, country: string) {
    this.select({ kind: "admin", name, country }, true);
  }

  selectRoute(name: string) {
    this.select({ kind: "route", name }, true);
  }

  /** The viewer clicked the hidden Surveyor. */
  foundSurveyor() {
    if (!this.found.has(this.data.year)) {
      this.found.add(this.data.year);
      saveFound(this.found);
    }
    this.select({ kind: "surveyor" }, true);
  }

  // --- Controls --------------------------------------------------------------

  private buildTimeline() {
    const n = this.years.length;
    this.slider.max = String(n - 1);
    $("ticks").innerHTML = this.years
      .map((y, i) => {
        const left = (i / (n - 1)) * 100;
        const major = TICK_YEARS.includes(y);
        const compact = COMPACT_TICKS.includes(y) ? " compact" : "";
        return `<span class="tick${major ? " major" : ""}${compact}" style="left:${left}%">${major ? `<span>${y === -1 ? "1 BCE" : formatYear(y).replace(" CE", "")}</span>` : ""}</span>`;
      })
      .join("");
    $("compare-year").innerHTML = this.years.map((y) => `<option value="${y}">${formatYear(y)}</option>`).join("");

    // Era ribbon: one segment per era, spanning its snapshots on the slider's scale.
    const firstIndex = ERAS.map((e) => this.years.findIndex((y) => y >= e.from));
    $("eras").innerHTML = ERAS.map((e, k) => {
      const start = firstIndex[k];
      const end = k + 1 < ERAS.length ? firstIndex[k + 1] : n - 1;
      const left = (start / (n - 1)) * 100;
      const width = ((end - start) / (n - 1)) * 100;
      return `<button type="button" class="era" data-name="${e.name}" data-from="${this.years[start]}" style="left:${left}%;width:${width}%">${e.name}</button>`;
    }).join("");
    for (const b of document.querySelectorAll<HTMLElement>(".era")) {
      b.addEventListener("click", () => {
        this.stopPlay();
        this.setIndex(this.years.indexOf(Number(b.dataset.from)));
      });
    }
  }

  private bindControls() {
    this.slider.addEventListener("input", () => this.setIndex(Number(this.slider.value)));
    $("btn-prev").addEventListener("click", () => this.step(-1));
    $("btn-next").addEventListener("click", () => this.step(1));
    $("btn-play").addEventListener("click", () => this.togglePlay());
    $("btn-overview").addEventListener("click", () => this.select(this.compareIndex !== null ? { kind: "compare" } : { kind: "none" }, true));
    $("btn-list").addEventListener("click", () => this.select(this.selection.kind === "list" ? { kind: "none" } : { kind: "list" }, true));
    $("btn-compare").addEventListener("click", () => {
      if (this.compareIndex !== null) this.closeCompare();
      else this.openCompare(Math.min(this.index + 1, this.years.length - 1));
    });
    $<HTMLSelectElement>("compare-year").addEventListener("change", (e) =>
      this.setCompareIndex(this.years.indexOf(Number((e.target as HTMLSelectElement).value))),
    );
    $("compare-prev").addEventListener("click", () => this.compareIndex !== null && this.setCompareIndex(this.compareIndex - 1));
    $("compare-next").addEventListener("click", () => this.compareIndex !== null && this.setCompareIndex(this.compareIndex + 1));

    const themeBtn = $("btn-theme");
    let themeChoice = loadThemeChoice();
    const showTheme = () => {
      themeBtn.textContent = THEME_LABEL[themeChoice];
      themeBtn.setAttribute("aria-label", `Map style: ${THEME_LABEL[themeChoice]}. Change style`);
    };
    showTheme();
    themeBtn.addEventListener("click", () => {
      themeChoice = THEME_ORDER[(THEME_ORDER.indexOf(themeChoice) + 1) % THEME_ORDER.length];
      saveThemeChoice(themeChoice);
      applyTheme(themeChoice);
      showTheme();
    });
    // Panel markers are drawn in theme colours, so redraw the panel too.
    window.addEventListener("atlas-theme", () => this.select(this.selection, false));
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if (themeChoice === "auto") applyTheme("auto");
    });

    const proj = $("btn-projection");
    proj.addEventListener("click", () => {
      const globe = proj.getAttribute("aria-pressed") !== "true";
      proj.setAttribute("aria-pressed", String(globe));
      this.atlas.setGlobe(globe);
      this.atlasB?.setGlobe(globe);
    });

    document.addEventListener("keydown", (e) => {
      const t = e.target as HTMLElement;
      if (t.matches("input, textarea, select") || t.closest(".maplibregl-canvas-container")) return;
      if (e.key === "[" || (e.key === "ArrowLeft" && t === document.body)) this.step(-1);
      else if (e.key === "]" || (e.key === "ArrowRight" && t === document.body)) this.step(1);
      else if (e.key === "/") {
        e.preventDefault();
        $("search-input").focus();
      }
    });

    initPanel();
  }

  private step(d: number) {
    this.stopPlay();
    this.setIndex(this.index + d);
  }

  private togglePlay() {
    if (this.playTimer !== null) return this.stopPlay();
    if (this.index >= this.years.length - 1) this.setIndex(0);
    const btn = $("btn-play");
    btn.setAttribute("aria-pressed", "true");
    btn.setAttribute("aria-label", "Pause");
    btn.textContent = "❚❚";
    this.playTimer = window.setInterval(() => {
      if (this.index >= this.years.length - 1) return this.stopPlay();
      this.setIndex(this.index + 1);
    }, PLAY_INTERVAL_MS);
  }

  private stopPlay() {
    if (this.playTimer === null) return;
    clearInterval(this.playTimer);
    this.playTimer = null;
    const btn = $("btn-play");
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", "Play through time");
    btn.textContent = "▶";
  }
}

function eraOf(year: number) {
  return [...ERAS].reverse().find((e) => year >= e.from)!.name;
}

function nearest(ys: number[], target: number) {
  return ys.reduce((best, y) => (Math.abs(y - target) < Math.abs(best - target) ? y : best), ys[0]);
}

// --- Shareable URLs: #y=1914&p=Serbia | #y=1914&e=ww1 | #y=1914&v=list | #y=1914&c=1920

function toHash(year: number, sel: Selection, compare: number | null) {
  const q = new URLSearchParams({ y: String(year) });
  if (compare !== null) q.set("c", String(compare));
  if (sel.kind === "polity") q.set("p", sel.name);
  if (sel.kind === "event") q.set("e", sel.id);
  if (sel.kind === "list") q.set("v", "list");
  if (sel.kind === "drawing") q.set("d", sel.id);
  return "#" + q.toString();
}

function parseHash(hash: string): { year?: number; compare?: number; selection: Selection } {
  const q = new URLSearchParams(hash.slice(1));
  const num = (k: string) => {
    const v = q.get(k);
    return v !== null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined;
  };
  const selection: Selection = q.get("p")
    ? { kind: "polity", name: q.get("p")! }
    : q.get("e")
      ? { kind: "event", id: q.get("e")! }
      : q.get("d")
        ? { kind: "drawing", id: q.get("d")! }
        : q.get("v") === "list"
          ? { kind: "list" }
          : { kind: "none" };
  return { year: num("y"), compare: num("c"), selection };
}

async function boot() {
  applyTheme(loadThemeChoice());
  try {
    const [meta, curated, land, drawings, spots] = await Promise.all([loadMeta(), loadEvents(), loadLand(), loadDrawings(), loadSurveyor()]);
    let app: App;
    const atlas = await AtlasMap.create("map", land, {
      onPolityClick: (name) => app.selectPolity(name, undefined, false),
      onEventClick: (id) => app.selectEvent(id, false),
      onDrawingClick: (id) => app.selectDrawing(id, false),
      onSurveyorClick: () => app.foundSurveyor(),
      onRouteClick: (name) => app.selectRoute(name),
      onCityClick: (qid) => app.selectCity(qid),
      onAdminClick: (name, country) => app.selectAdmin(name, country),
    });
    app = new App(meta, curated, atlas, land, drawings, spots);
    // Handy for testing in development; not present in production builds.
    if (import.meta.env.DEV) {
      Object.assign(window, { __atlas: atlas, __app: app });
      // ?cam=lon,lat,zoom jumps the camera, for screenshots of a given view.
      const cam = new URLSearchParams(location.search).get("cam")?.split(",").map(Number);
      if (cam?.length === 3) atlas.map.jumpTo({ center: [cam[0], cam[1]], zoom: cam[2] });
    }
    const search = initSearch(meta, curated, drawings, {
      onPolity: (name, years) => app.selectPolity(name, nearest(years, Number(new URLSearchParams(location.hash.slice(1)).get("y") ?? 1914)), true),
      onEvent: (e) => app.selectEvent(e.id, true),
      onDrawing: (d) => app.selectDrawing(d.id, true),
    });
    await app.start();
    loadCities()
      .then((c) => app.setCities(c))
      .catch((err) => console.warn("Cities unavailable", err));
    loadAdmin1()
      .then((a) => app.setAdmin1(a))
      .catch((err) => console.warn("States and provinces unavailable", err));
    loadScenery()
      .then((s) => app.setScenery(s))
      .catch((err) => console.warn("Scenery unavailable", err));
    // The full event set is large; load it after the first map is on screen.
    loadWikidataEvents()
      .then((wd) => {
        app.setWikidataEvents(wd);
        search.addEvents(wd);
      })
      .catch((err) => console.warn("Wikidata events unavailable", err));
  } catch (err) {
    console.error(err);
    $("panel").innerHTML = `<h2>Something went wrong</h2><p>The atlas data could not be loaded. Please refresh the page.</p>`;
  }
}

boot();
