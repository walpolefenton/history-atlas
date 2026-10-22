import "./style.css";
import { AtlasMap } from "./map";
import { eventsForEra, loadEvents, loadLand, loadMeta, loadWikidataEvents, loadYear } from "./data";
import { formatYear } from "./format";
import { initPanel, renderCompare, renderEvent, renderList, renderOverview, renderPolity, type PanelContext } from "./panel";
import { initSearch } from "./search";
import type { EventType, HistoryEvent, Meta, Selection, YearData } from "./types";

const TICK_YEARS = [-10000, -3000, -1000, -1, 500, 1000, 1500, 1800, 1914, 2010];
/** The subset still labelled on narrow screens. */
const COMPACT_TICKS = [-3000, 500, 1500, 2010];
const PLAY_INTERVAL_MS = 1800;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

interface Era {
  data: YearData;
  next: number | null;
  /** Hand-curated events, shown first. */
  key: HistoryEvent[];
  /** Imported Wikidata events, most widely covered first. */
  more: HistoryEvent[];
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
  /** Event requested by URL before the Wikidata events had loaded. */
  private pendingEvent: string | null = null;

  // Compare mode: a second map showing another snapshot, camera-synced.
  private compareIndex: number | null = null;
  private compareData: YearData | null = null;
  private atlasB: AtlasMap | null = null;

  constructor(
    private meta: Meta,
    private curated: HistoryEvent[],
    private atlas: AtlasMap,
    private land: GeoJSON.FeatureCollection,
  ) {}

  private get years() {
    return this.meta.years.map((y) => y.year);
  }

  private get allEvents() {
    return this.curated.concat(this.wdEvents);
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
    };
  }

  private context(): PanelContext {
    const era = this.era(this.index, this.data);
    return {
      meta: this.meta,
      data: this.data,
      nextYear: era.next,
      eraEvents: era.key,
      moreEvents: era.more,
      hiddenTypes: this.hiddenTypes,
      compare: this.compareData,
      actions: {
        selectPolity: (name, year) => this.selectPolity(name, year, true),
        selectEvent: (id) => this.selectEvent(id, true),
        goToYear: (year) => this.setIndex(this.years.indexOf(year)),
        showOverview: () => this.select({ kind: "none" }, true),
        toggleType: (t) => this.toggleType(t),
        setCompareYear: (year) => this.setCompareIndex(this.years.indexOf(year)),
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
    document.body.classList.add("loading");

    const data = await loadYear(year);
    if (token !== this.loadToken) return; // a newer request superseded this one
    this.data = data;
    const era = this.era(i, data);
    await this.atlas.setYear(data, era.key, era.more);
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
    }
    if (this.compareIndex !== null && sel.kind === "none") sel = { kind: "compare" };
    this.select(sel, false);

    // Warm the neighbours so stepping through time feels instant.
    for (const j of [i - 1, i + 1]) if (this.years[j] !== undefined) loadYear(this.years[j]).catch(() => {});
  }

  /** Re-applies events and panel after a filter or data change, without reloading borders. */
  private refresh() {
    const era = this.era(this.index, this.data);
    this.atlas.setYear(this.data, era.key, era.more);
    if (this.atlasB && this.compareData && this.compareIndex !== null) {
      const b = this.era(this.compareIndex, this.compareData);
      this.atlasB.setYear(this.compareData, b.key, b.more);
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
      this.atlasB = new AtlasMap("map-b", this.land, {
        onPolityClick: (name) => this.selectPolity(name, undefined, false),
        onEventClick: (id) => this.selectEvent(id, false),
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
    const b = this.era(i, data);
    await this.atlasB.setYear(data, b.key, b.more);
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
      : q.get("v") === "list"
        ? { kind: "list" }
        : { kind: "none" };
  return { year: num("y"), compare: num("c"), selection };
}

async function boot() {
  try {
    const [meta, curated, land] = await Promise.all([loadMeta(), loadEvents(), loadLand()]);
    let app: App;
    const atlas = new AtlasMap("map", land, {
      onPolityClick: (name) => app.selectPolity(name, undefined, false),
      onEventClick: (id) => app.selectEvent(id, false),
    });
    app = new App(meta, curated, atlas, land);
    const search = initSearch(meta, curated, {
      onPolity: (name, years) => app.selectPolity(name, nearest(years, Number(new URLSearchParams(location.hash.slice(1)).get("y") ?? 1914)), true),
      onEvent: (e) => app.selectEvent(e.id, true),
    });
    await app.start();
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
