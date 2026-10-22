import "./style.css";
import { AtlasMap } from "./map";
import { eventsForEra, loadEvents, loadLand, loadMeta, loadYear } from "./data";
import { formatYear } from "./format";
import { initPanel, renderEvent, renderList, renderOverview, renderPolity, type PanelContext } from "./panel";
import { initSearch } from "./search";
import type { HistoryEvent, Meta, Selection, YearData } from "./types";

const TICK_YEARS = [-10000, -3000, -1000, -1, 500, 1000, 1500, 1800, 1914, 2010];
/** The subset still labelled on narrow screens. */
const COMPACT_TICKS = [-3000, 500, 1500, 2010];
const PLAY_INTERVAL_MS = 1800;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

class App {
  private index = 0;
  private data!: YearData;
  private selection: Selection = { kind: "none" };
  private playTimer: number | null = null;
  private loadToken = 0;
  private slider = $<HTMLInputElement>("year-slider");

  constructor(private meta: Meta, private events: HistoryEvent[], private atlas: AtlasMap) {}

  private get years() {
    return this.meta.years.map((y) => y.year);
  }

  private context(): PanelContext {
    const next = this.meta.years[this.index + 1]?.year ?? null;
    return {
      meta: this.meta,
      data: this.data,
      nextYear: next,
      eraEvents: eventsForEra(this.events, this.data.year, next),
      actions: {
        selectPolity: (name, year) => this.selectPolity(name, year, true),
        selectEvent: (id) => this.selectEvent(id, true),
        goToYear: (year) => this.setIndex(this.years.indexOf(year)),
        showOverview: () => this.select({ kind: "none" }, true),
      },
    };
  }

  async start() {
    this.buildTimeline();
    this.bindControls();
    const s = parseHash(location.hash);
    const idx = s.year !== undefined ? this.years.indexOf(s.year) : -1;
    await this.setIndex(idx >= 0 ? idx : this.years.indexOf(1914), s.selection);
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
    const ctx = this.context();
    await this.atlas.setYear(data, ctx.eraEvents);
    document.body.classList.remove("loading");

    // Keep the current selection when it still makes sense in the new year.
    let sel = selection ?? this.selection;
    if (sel.kind === "polity") {
      const name = sel.name;
      if (!data.borders.features.some((f) => f.properties.name === name)) sel = { kind: "none" };
    } else if (sel.kind === "event") {
      const id = sel.id;
      if (!ctx.eraEvents.some((e) => e.id === id)) sel = { kind: "none" };
    }
    this.select(sel, false);

    // Warm the neighbours so stepping through time feels instant.
    for (const j of [i - 1, i + 1]) if (this.years[j] !== undefined) loadYear(this.years[j]).catch(() => {});
  }

  // --- Selection -------------------------------------------------------------

  private select(sel: Selection, focusPanel: boolean) {
    this.selection = sel;
    const ctx = this.context();
    if (sel.kind === "polity") renderPolity(ctx, sel.name, focusPanel);
    else if (sel.kind === "event") {
      const e = this.events.find((x) => x.id === sel.id);
      if (e) renderEvent(ctx, e, focusPanel);
      else renderOverview(ctx, focusPanel);
    } else if (sel.kind === "list") renderList(ctx, focusPanel);
    else renderOverview(ctx, focusPanel);

    this.atlas.highlight(sel.kind === "polity" ? sel.name : null, sel.kind === "event" ? sel.id : null);
    $("btn-list").setAttribute("aria-pressed", String(sel.kind === "list"));
    $("btn-overview").setAttribute("aria-pressed", String(sel.kind === "none"));
    history.replaceState(null, "", toHash(this.data.year, sel));
  }

  async selectPolity(name: string, year: number | undefined, fly: boolean) {
    if (year !== undefined && year !== this.data.year) {
      await this.setIndex(this.years.indexOf(year), { kind: "polity", name });
    } else if (!this.data.borders.features.some((f) => f.properties.name === name)) {
      // Not on this map (e.g. a sovereign named only as a ruler): jump to the nearest year it appears.
      const ys = this.meta.appearances[name];
      if (!ys?.length) return;
      await this.setIndex(this.years.indexOf(nearest(ys, this.data.year)), { kind: "polity", name });
    } else {
      this.select({ kind: "polity", name }, true);
    }
    if (fly) {
      const f = this.data.borders.features.find((x) => x.properties.name === name);
      if (f) this.atlas.fitFeature(f.geometry);
    }
  }

  async selectEvent(id: string, fly: boolean) {
    const e = this.events.find((x) => x.id === id);
    if (!e) return;
    const ctxEvents = this.context().eraEvents;
    if (!ctxEvents.some((x) => x.id === id)) {
      // Jump to the snapshot whose era contains the event's start.
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
  }

  private bindControls() {
    this.slider.addEventListener("input", () => this.setIndex(Number(this.slider.value)));
    $("btn-prev").addEventListener("click", () => this.step(-1));
    $("btn-next").addEventListener("click", () => this.step(1));
    $("btn-play").addEventListener("click", () => this.togglePlay());
    $("btn-overview").addEventListener("click", () => this.select({ kind: "none" }, true));
    $("btn-list").addEventListener("click", () => this.select(this.selection.kind === "list" ? { kind: "none" } : { kind: "list" }, true));

    const proj = $("btn-projection");
    proj.addEventListener("click", () => {
      const globe = proj.getAttribute("aria-pressed") !== "true";
      proj.setAttribute("aria-pressed", String(globe));
      this.atlas.setGlobe(globe);
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

// --- Shareable URLs: #y=1914&p=Serbia | #y=1914&e=ww1 | #y=1914&v=list --------

function toHash(year: number, sel: Selection) {
  const q = new URLSearchParams({ y: String(year) });
  if (sel.kind === "polity") q.set("p", sel.name);
  if (sel.kind === "event") q.set("e", sel.id);
  if (sel.kind === "list") q.set("v", "list");
  return "#" + q.toString();
}

function parseHash(hash: string): { year?: number; selection: Selection } {
  const q = new URLSearchParams(hash.slice(1));
  const y = q.get("y");
  const selection: Selection = q.get("p")
    ? { kind: "polity", name: q.get("p")! }
    : q.get("e")
      ? { kind: "event", id: q.get("e")! }
      : q.get("v") === "list"
        ? { kind: "list" }
        : { kind: "none" };
  return { year: y !== null && !Number.isNaN(Number(y)) ? Number(y) : undefined, selection };
}

async function boot() {
  try {
    const [meta, events, land] = await Promise.all([loadMeta(), loadEvents(), loadLand()]);
    let app: App;
    const atlas = new AtlasMap("map", land, {
      onPolityClick: (name) => app.selectPolity(name, undefined, false),
      onEventClick: (id) => app.selectEvent(id, false),
      onBackgroundClick: () => {},
    });
    app = new App(meta, events, atlas);
    initSearch(meta, events, {
      onPolity: (name, years) => app.selectPolity(name, nearest(years, Number(new URLSearchParams(location.hash.slice(1)).get("y") ?? 1914)), true),
      onEvent: (e) => app.selectEvent(e.id, true),
    });
    await app.start();
  } catch (err) {
    console.error(err);
    $("panel").innerHTML = `<h2>Something went wrong</h2><p>The atlas data could not be loaded. Please refresh the page.</p>`;
  }
}

boot();
