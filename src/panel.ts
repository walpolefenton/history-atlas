import type { LayerGroup } from "./map";
import type { AdminProps, City, Drawing, EventType, HistoryEvent, Meta, RouteInfo, SurveyorSpot, YearData } from "./types";
import { cityNameAt } from "./data";
import { EVENT_TYPES, PRECISION_LABEL, escapeHtml as esc, formatArea, formatEventDate, formatYear } from "./format";
import { eventArticle, polityArticle, type WikiSummary } from "./wiki";
import { eventIconSvg, modernEventSvg } from "./icons";
import { drawingSvg } from "./drawings";
import { currentTheme } from "./theme";
import { creditHtml, drawingImage, eraImage, type AtlasImage } from "./images";

/** The same pictogram the map uses for this event type, in the current theme. */
function marker(type: EventType) {
  const t = currentTheme();
  const svg = t.modern ? modernEventSvg(type, t.events[type], t.ring) : eventIconSvg(type, t.events[type], t.ring, t.clay);
  return `<span class="marker" aria-hidden="true">${svg}</span>`;
}

export interface PanelContext {
  meta: Meta;
  data: YearData;
  /** Year of the next snapshot, or null for the latest. */
  nextYear: number | null;
  /** Curated events of this era. */
  eraEvents: HistoryEvent[];
  /** Wikidata events of this era, most widely covered first. */
  moreEvents: HistoryEvent[];
  hiddenTypes: Set<EventType>;
  /** Layer groups the reader has switched off. */
  hiddenLayers: Set<LayerGroup>;
  /** A short summary of the world in this snapshot (public/data/eras.json). */
  summary: string | null;
  /** The second snapshot, when compare mode is on. */
  compare: YearData | null;
  /** Landmarks and curiosities that existed during this era. */
  drawings: Drawing[];
  surveyor: { spot: SurveyorSpot | null; found: boolean; count: number; total: number };
  actions: {
    selectPolity(name: string, year?: number): void;
    selectEvent(id: string): void;
    goToYear(year: number): void;
    showOverview(): void;
    toggleType(type: EventType): void;
    setCompareYear(year: number): void;
    selectDrawing(id: string): void;
    showSurveyor(): void;
    toggleLayer(group: LayerGroup): void;
    saveImage(): Promise<void>;
  };
}

const panel = () => document.getElementById("panel")!;

// Every panel is plain HTML with buttons carrying data-* attributes; one
// delegated listener turns those into actions.
let current: PanelContext | null = null;

export function initPanel() {
  panel().addEventListener("click", (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!el || !current) return;
    const { action, name, id, year, type } = el.dataset;
    if (action === "polity") current.actions.selectPolity(name!, year ? Number(year) : undefined);
    else if (action === "event") current.actions.selectEvent(id!);
    else if (action === "year") current.actions.goToYear(Number(year));
    else if (action === "overview") current.actions.showOverview();
    else if (action === "sheet") setSheetOpen(!document.body.classList.contains("sheet-open"));
    else if (action === "type") current.actions.toggleType(type as EventType);
    else if (action === "layer") current.actions.toggleLayer(el.dataset.layer as LayerGroup);
    else if (action === "copy-link") {
      navigator.clipboard
        ?.writeText(location.href)
        .then(() => (el.textContent = "Link copied"))
        .catch(() => (el.textContent = "Copy the address bar instead"));
    } else if (action === "save-image") {
      el.textContent = "Preparing image…";
      current.actions
        .saveImage()
        .then(() => (el.textContent = "Save map image"))
        .catch(() => (el.textContent = "Couldn't save the image"));
    }
    else if (action === "compare-year") current.actions.setCompareYear(Number(year));
    else if (action === "drawing") current.actions.selectDrawing(id!);
    else if (action === "drawing-surveyor") current.actions.showSurveyor();
    else if (action === "hint") {
      const hint = current.surveyor.spot?.hint;
      if (hint) el.outerHTML = `<p class="small hint">Try looking around ${esc(hint)}, zoomed well in.</p>`;
    }
    else if (action === "more-events") {
      for (const li of panel().querySelectorAll<HTMLElement>(".event-list .extra")) li.hidden = false;
      el.remove();
    }
  });
  // Swipe the handle up to open the sheet, down to close it.
  let startY: number | null = null;
  panel().addEventListener("touchstart", (ev) => {
    startY = (ev.target as HTMLElement).closest(".sheet-handle") ? ev.touches[0].clientY : null;
  }, { passive: true });
  panel().addEventListener("touchend", (ev) => {
    if (startY === null) return;
    const dy = ev.changedTouches[0].clientY - startY;
    if (Math.abs(dy) > 24) setSheetOpen(dy < 0);
    startY = null;
  }, { passive: true });
  panel().addEventListener("input", (ev) => {
    const input = ev.target as HTMLInputElement;
    if (input.id !== "list-filter") return;
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const li of panel().querySelectorAll<HTMLElement>("[data-filter]")) {
      const hit = !q || li.dataset.filter!.includes(q);
      li.hidden = !hit;
      if (hit && li.matches(".territory")) shown++;
    }
    for (const group of panel().querySelectorAll<HTMLElement>(".sovereign-group")) {
      group.hidden = !group.querySelector(".territory:not([hidden])");
    }
    document.getElementById("list-count")!.textContent = `${shown} shown`;
  });
}

/**
 * On phones the panel is a bottom sheet: it peeks up over the map and the handle
 * (or a swipe on it) opens it to nearly full height. The handle is hidden on
 * wider screens, where the panel is a sidebar.
 */
const sheetHandle = () => {
  const open = document.body.classList.contains("sheet-open");
  return `<button type="button" class="sheet-handle" data-action="sheet" aria-expanded="${open}" aria-label="${open ? "Collapse details" : "Expand details"}"><span></span></button>`;
};

export function setSheetOpen(open: boolean) {
  document.body.classList.toggle("sheet-open", open);
  const h = panel().querySelector(".sheet-handle");
  h?.setAttribute("aria-expanded", String(open));
  h?.setAttribute("aria-label", open ? "Collapse details" : "Expand details");
}

function render(ctx: PanelContext, html: string, focus = false) {
  current = ctx;
  const el = panel();
  el.innerHTML = sheetHandle() + html;
  el.scrollTop = 0;
  if (focus) el.focus({ preventScroll: true });
}

const backButton = `<button type="button" class="back" data-action="overview">← Overview</button>`;

function eventButton(e: HistoryEvent, extra = false) {
  const t = EVENT_TYPES[e.type];
  return `<li${extra ? ' class="extra" hidden' : ""}><button type="button" class="event-row" data-action="event" data-id="${esc(e.id)}">
    ${marker(e.type)}
    <span class="event-row-text"><span class="event-title">${esc(e.title)}</span>
    <span class="muted">${formatEventDate(e)} · ${t.label}</span></span>
  </button></li>`;
}

function eraRange(ctx: PanelContext) {
  const { year } = ctx.data;
  if (ctx.nextYear === null) return `${formatYear(year)} onward`;
  return formatEventDate({ start: year, end: ctx.nextYear } as HistoryEvent);
}

// --- Overview ---------------------------------------------------------------

const MORE_EVENTS_SHOWN = 25;

export function renderOverview(ctx: PanelContext, focus = false) {
  const { data, meta, eraEvents, moreEvents } = ctx;
  const idx = meta.years.findIndex((y) => y.year === data.year);
  const sovereigns = new Set(data.borders.features.map((f) => f.properties.sovereign));
  // The legend doubles as a filter for both the map and the lists below.
  const legend = (Object.entries(EVENT_TYPES) as [EventType, (typeof EVENT_TYPES)[EventType]][])
    .map(([k, t]) => {
      const on = !ctx.hiddenTypes.has(k);
      return `<li><button type="button" class="type-toggle" data-action="type" data-type="${k}" aria-pressed="${on}">
        ${marker(k)}${t.label}</button></li>`;
    })
    .join("");
  const more = moreEvents.length
    ? `<section>
        <h3>More events (${moreEvents.length})</h3>
        <p class="small muted">From Wikidata, most widely covered first.</p>
        <ul class="event-list">${moreEvents.map((e, i) => eventButton(e, i >= MORE_EVENTS_SHOWN)).join("")}</ul>
        ${moreEvents.length > MORE_EVENTS_SHOWN ? `<button type="button" class="link small" data-action="more-events">Show all ${moreEvents.length}</button>` : ""}
      </section>`
    : "";

  const art = eraImage(data.year);
  render(
    ctx,
    `${art ? photoFigure(art, art.caption, "era-hero") : ""}
    <h2>The world in ${formatYear(data.year)}</h2>
    <p class="muted">Snapshot ${idx + 1} of ${meta.years.length}. ${
      ctx.nextYear === null ? "This is the most recent map." : `The next map is ${formatYear(ctx.nextYear)}.`
    }</p>
    ${ctx.summary ? `<p class="era-summary">${esc(ctx.summary)}</p>` : ""}
    <dl class="stats">
      <div><dt>Territories</dt><dd>${data.borders.features.length}</dd></div>
      <div><dt>Sovereign powers</dt><dd>${sovereigns.size}</dd></div>
      <div><dt>Known capitals</dt><dd>${data.capitals.features.length}</dd></div>
    </dl>
    <section>
      <h3>Show event types</h3>
      <ul class="legend">${legend}</ul>
    </section>
    <section>
      <h3>Show on the map</h3>
      <ul class="layer-toggles">${(
        [
          ["landmarks", "Landmarks and places"],
          ["cities", "Cities"],
          ["provinces", "States and provinces"],
          ["minorEvents", "Other recorded events"],
        ] as [LayerGroup, string][]
      )
        .map(([g, label]) => `<li><button type="button" class="layer-toggle" data-action="layer" data-layer="${g}" aria-pressed="${!ctx.hiddenLayers.has(g)}">${label}</button></li>`)
        .join("")}</ul>
    </section>
    <section>
      <h3>Key events, ${eraRange(ctx)}</h3>
      ${
        eraEvents.length
          ? `<ul class="event-list">${eraEvents.map((e) => eventButton(e)).join("")}</ul>`
          : `<p class="muted">No key events recorded for this period yet.</p>`
      }
    </section>
    ${more}
    ${lookCloser(ctx)}
    <section>
      <h3>Share or save</h3>
      <p class="small muted">The link holds this year, what's selected and the view, so others see exactly this map.</p>
      <div class="share-row">
        <button type="button" class="tool" data-action="copy-link">Copy link</button>
        <button type="button" class="tool" data-action="save-image">Save map image</button>
      </div>
    </section>
    <section>
      <h3>Reading the map</h3>
      <p class="muted small">Territories ruled by the same power share a colour. Dashed outlines mark approximate borders. Large markers are key events; small ones are other recorded events, and more appear as you zoom in. ${currentTheme().modern ? "A ringed dot marks a capital; round photographs mark landmarks." : "The tower marks a capital."} Select anything to learn more.</p>
    </section>
    ${sourcesNote}`,
    focus,
  );
}

const sourcesNote = `<section class="sources">
  <h3>About the data</h3>
  <p class="small muted">Borders come from the open <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener">historical-basemaps</a> project, which its authors describe as a work in progress. Capitals and most events come from Wikidata, and descriptions from Wikipedia. Key events are a hand-written set that is still being reviewed. Check important facts against the linked sources.</p>
</section>`;

// --- Polity -----------------------------------------------------------------

/** Groups consecutive snapshot appearances into ranges like "1815 – 1914". */
function appearanceRanges(meta: Meta, name: string): number[][] {
  const years = new Set(meta.appearances[name] ?? []);
  const ranges: number[][] = [];
  let run: number[] = [];
  for (const { year } of meta.years) {
    if (years.has(year)) run.push(year);
    else if (run.length) (ranges.push(run), (run = []));
  }
  if (run.length) ranges.push(run);
  return ranges;
}

export function renderPolity(ctx: PanelContext, name: string, focus = false) {
  const { data, meta } = ctx;
  const parts = data.borders.features.filter((f) => f.properties.name === name);
  if (!parts.length) return renderOverview(ctx, focus);
  const p = parts[0].properties;
  const km2 = parts.reduce((s, f) => s + f.properties.km2, 0);
  const capital = data.capitals.features.find((f) => f.properties.of === name)?.properties;
  const precision = p.precision ? PRECISION_LABEL[p.precision] : null;

  const territories = data.borders.features.filter((f) => f.properties.sovereign === name && f.properties.name !== name);
  const ranges = appearanceRanges(meta, name);
  const yearChip = (y: number) =>
    `<button type="button" class="chip${y === data.year ? " current" : ""}" data-action="polity" data-name="${esc(name)}" data-year="${y}"${
      y === data.year ? ' aria-current="true"' : ""
    }>${formatYear(y)}</button>`;

  render(
    ctx,
    `${backButton}
    <h2>${esc(name)}</h2>
    ${
      p.sovereign !== name
        ? `<p class="lede">Ruled by <button type="button" class="link" data-action="polity" data-name="${esc(p.sovereign)}">${esc(p.sovereign)}</button> in ${formatYear(data.year)}</p>`
        : `<p class="lede">As mapped in ${formatYear(data.year)}</p>`
    }
    <dl class="facts">
      <div><dt>Capital</dt><dd>${
        capital
          ? `${esc(capital.name)} <a class="small" href="https://www.wikidata.org/wiki/${capital.qid}" target="_blank" rel="noopener">(source)</a>`
          : `<span class="muted">Not recorded</span>`
      }</dd></div>
      <div><dt>Approx. area</dt><dd>${formatArea(km2)}</dd></div>
      ${precision ? `<div><dt>Border accuracy</dt><dd>${precision.label}<span class="small muted block">${precision.detail}</span></dd></div>` : ""}
    </dl>
    ${
      territories.length
        ? `<section><h3>Territories it rules (${territories.length})</h3><ul class="territory-list">${territories
            .sort((a, b) => b.properties.km2 - a.properties.km2)
            .map((f) => `<li><button type="button" class="link" data-action="polity" data-name="${esc(f.properties.name)}">${esc(f.properties.name)}</button></li>`)
            .join("")}</ul></section>`
        : ""
    }
    ${todaySection(parts)}
    <section>
      <h3>On the map</h3>
      ${historyChart(meta, name, data.year)}
      <p class="small muted">Snapshots where “${esc(name)}” appears under this name:</p>
      ${ranges.map((r) => `<div class="chips">${r.map(yearChip).join("")}</div>`).join("")}
    </section>
    <section aria-live="polite" id="wiki"><p class="muted">Loading Wikipedia summary…</p></section>`,
    focus,
  );

  polityArticle(name, p.qid).then((w) => {
    if (current?.data !== data) return;
    fillWiki(w, w?.match === "search" ? `This article was found by search and may not be exactly “${name}”.` : null);
  });
}

/**
 * A territory's size across the snapshots it appears in: one bar per snapshot,
 * scaled to its largest extent, the year on screen picked out. Bars are
 * buttons, so the chart doubles as a way to move through its history.
 */
function historyChart(meta: Meta, name: string, year: number) {
  const years = meta.appearances[name] ?? [];
  const areas = meta.areas?.[name];
  if (!areas || years.length < 2) return "";
  const max = Math.max(...areas);
  const peak = years[areas.indexOf(max)];
  const W = 320, H = 72, gap = years.length > 30 ? 1 : 2;
  const bw = (W - gap * (years.length - 1)) / years.length;
  const bars = years
    .map((y, i) => {
      const h = Math.max(2, (areas[i] / max) * (H - 4));
      const x = i * (bw + gap);
      return `<rect class="hist-bar${y === year ? " current" : ""}" x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1" data-action="polity" data-name="${esc(name)}" data-year="${y}"><title>${formatYear(y)}: ${formatArea(areas[i])}</title></rect>`;
    })
    .join("");
  return `<figure class="hist" aria-label="Area of ${esc(name)} in each snapshot">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-hidden="true">${bars}</svg>
    <figcaption class="small muted"><span>${formatYear(years[0])}</span><span>Largest: ${formatArea(max)}, ${formatYear(peak)}</span><span>${formatYear(years[years.length - 1])}</span></figcaption>
  </figure>`;
}

/**
 * Where a territory lies on today's map: the present-day countries its land
 * falls in, with their shares, combined across all of its parts by area.
 */
function todaySection(parts: { properties: { km2: number; today?: string } }[]) {
  const shares = new Map<string, number>();
  const total = parts.reduce((s, f) => s + f.properties.km2, 0) || 1;
  for (const f of parts)
    for (const entry of (f.properties.today ?? "").split("|").filter(Boolean)) {
      const [country, pct] = entry.split(":");
      shares.set(country, (shares.get(country) ?? 0) + (Number(pct) * f.properties.km2) / total);
    }
  const rows = [...shares].filter(([, pct]) => pct >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!rows.length) return "";
  const single = rows.length === 1 && rows[0][1] > 95;
  return `<section><h3>Where it is today</h3>${
    single
      ? `<p>Its land lies within present-day <strong>${esc(rows[0][0])}</strong>.</p>`
      : `<ul class="today-list">${rows
          .map(([c, pct]) => `<li><span class="today-name">${esc(c)}</span><span class="today-bar" aria-hidden="true"><span style="width:${Math.max(3, Math.round(pct))}%"></span></span><span class="today-pct">${Math.round(pct)}%</span></li>`)
          .join("")}</ul><p class="small muted">Approximate share of its land in each present-day country.</p>`
  }</section>`;
}

// --- Event ------------------------------------------------------------------

/** "This took place in X, ruled by Y", from the territory under a point in this snapshot. */
function whereLine(ctx: PanelContext, lon: number, lat: number, lead: string) {
  const where = territoryAt(ctx, lon, lat);
  if (!where) return "";
  return `<p class="small muted">${lead} <button type="button" class="link" data-action="polity" data-name="${esc(where.name)}">${esc(where.name)}</button>${
    where.sovereign !== where.name ? `, ruled by <button type="button" class="link" data-action="polity" data-name="${esc(where.sovereign)}">${esc(where.sovereign)}</button>` : ""
  }, as mapped in ${formatYear(ctx.data.year)}.</p>`;
}

/** Other events of the same era within about 600 km, nearest first. */
function nearbyEvents(ctx: PanelContext, e: HistoryEvent) {
  const km = (a: HistoryEvent) => {
    const r = Math.PI / 180;
    const x = (a.lon - e.lon) * r * Math.cos(((a.lat + e.lat) / 2) * r);
    const y = (a.lat - e.lat) * r;
    return Math.hypot(x, y) * 6371;
  };
  const near = [...ctx.eraEvents, ...ctx.moreEvents]
    .filter((x) => x.id !== e.id)
    .map((x) => ({ x, d: km(x) }))
    .filter(({ d }) => d < 600)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);
  if (!near.length) return "";
  return `<section><h3>Nearby in this era</h3><ul class="event-list">${near.map(({ x }) => eventButton(x)).join("")}</ul></section>`;
}

export function renderEvent(ctx: PanelContext, e: HistoryEvent, focus = false) {
  const t = EVENT_TYPES[e.type];
  render(
    ctx,
    `${backButton}
    <p class="eyebrow">${marker(e.type)}${t.label}</p>
    <h2>${esc(e.title)}</h2>
    <p class="lede">${formatEventDate(e)}${e.approx ? ` <span class="small muted">(approximate or traditional date)</span>` : ""}</p>
    ${e.summary ? `<p>${esc(e.summary.charAt(0).toUpperCase() + e.summary.slice(1))}</p>` : ""}
    ${whereLine(ctx, e.lon, e.lat, "This took place in")}
    ${nearbyEvents(ctx, e)}
    <p class="small muted">${
      e.source === "wikidata"
        ? `Source: <a href="https://www.wikidata.org/wiki/${esc(e.id)}" target="_blank" rel="noopener">Wikidata ${esc(e.id)}</a>. Dates and location are as recorded there and may be approximate.`
        : "Key event, hand-written for History Atlas."
    }</p>
    <section aria-live="polite" id="wiki"><p class="muted">Loading Wikipedia summary…</p></section>`,
    focus,
  );
  eventArticle(e.wiki).then((w) => {
    if (current?.data !== ctx.data) return;
    fillWiki(w, null);
  });
}

function fillWiki(w: WikiSummary | null, caveat: string | null) {
  const el = document.getElementById("wiki");
  if (!el) return;
  if (!w) {
    el.innerHTML = `<p class="muted small">No Wikipedia summary found.</p>`;
    return;
  }
  el.innerHTML = `<h3>From Wikipedia</h3>
    ${w.thumbnail ? `<img class="wiki-thumb" src="${esc(w.thumbnail)}" alt="" loading="lazy" />` : ""}
    <p>${esc(w.extract)}</p>
    ${caveat ? `<p class="small caveat">${esc(caveat)}</p>` : ""}
    <p class="small"><a href="${esc(w.url)}" target="_blank" rel="noopener">Read “${esc(w.title)}” on Wikipedia</a> · <span class="muted">CC BY-SA</span></p>`;
}

// --- Text list of everything on the map ---------------------------------------

export function renderList(ctx: PanelContext, focus = false) {
  const { data } = ctx;
  const groups = new Map<string, { km2: number; names: { name: string; km2: number }[] }>();
  const seen = new Set<string>();
  for (const f of data.borders.features) {
    const { name, sovereign, km2 } = f.properties;
    const g = groups.get(sovereign) ?? { km2: 0, names: [] };
    g.km2 += km2;
    if (!seen.has(name)) g.names.push({ name, km2 }), seen.add(name);
    groups.set(sovereign, g);
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].km2 - a[1].km2);

  render(
    ctx,
    `${backButton}
    <h2>All territories in ${formatYear(data.year)}</h2>
    <p class="muted small">Grouped by ruling power, largest first. This list contains everything shown on the map.</p>
    <label class="visually-hidden" for="list-filter">Filter territories</label>
    <input id="list-filter" type="search" class="filter" placeholder="Filter…" />
    <p class="small muted" id="list-count" aria-live="polite">${seen.size} shown</p>
    ${sorted
      .map(
        ([sovereign, g]) => `<section class="sovereign-group">
        <h3><button type="button" class="link" data-action="polity" data-name="${esc(sovereign)}">${esc(sovereign)}</button>
        <span class="muted small">${formatArea(g.km2)}</span></h3>
        <ul class="territory-list">${g.names
          .sort((a, b) => b.km2 - a.km2)
          .map((n) => `<li class="territory" data-filter="${esc((n.name + " " + sovereign).toLowerCase())}"><button type="button" class="link" data-action="polity" data-name="${esc(n.name)}">${esc(n.name)}</button></li>`)
          .join("")}</ul></section>`,
      )
      .join("")}`,
    focus,
  );
}

// --- Compare two snapshots ---------------------------------------------------

interface Holding {
  km2: number;
  sovereign: string;
}

/** Totals each territory name, taking the ruler of its largest piece. */
function holdings(data: YearData): Map<string, Holding> {
  const out = new Map<string, Holding & { biggest: number }>();
  for (const f of data.borders.features) {
    const { name, km2, sovereign } = f.properties;
    const h = out.get(name) ?? { km2: 0, sovereign, biggest: 0 };
    h.km2 += km2;
    if (km2 > h.biggest) (h.biggest = km2), (h.sovereign = sovereign);
    out.set(name, h);
  }
  return out;
}

function powers(data: YearData): Map<string, number> {
  const out = new Map<string, number>();
  for (const f of data.borders.features) out.set(f.properties.sovereign, (out.get(f.properties.sovereign) ?? 0) + f.properties.km2);
  return out;
}

const COMPARE_LIST_LIMIT = 15;

export function renderCompare(ctx: PanelContext, focus = false) {
  const a = ctx.data;
  const b = ctx.compare!;
  const ha = holdings(a);
  const hb = holdings(b);
  const ya = formatYear(a.year);
  const yb = formatYear(b.year);

  const appeared = [...hb].filter(([n]) => !ha.has(n)).sort((x, y) => y[1].km2 - x[1].km2);
  const vanished = [...ha].filter(([n]) => !hb.has(n)).sort((x, y) => y[1].km2 - x[1].km2);
  const both = [...ha].filter(([n]) => hb.has(n)).map(([n, h]) => ({ name: n, a: h, b: hb.get(n)! }));
  const newRuler = both.filter((x) => x.a.sovereign !== x.b.sovereign).sort((x, y) => y.b.km2 - x.b.km2);
  const resized = both
    .map((x) => ({ ...x, delta: x.b.km2 - x.a.km2 }))
    .filter((x) => Math.abs(x.delta) >= 50_000 && Math.abs(x.delta) / Math.max(x.a.km2, x.b.km2) >= 0.1)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const pa = powers(a);
  const pb = powers(b);
  const top = [...new Set([...[...pa].sort((x, y) => y[1] - x[1]).slice(0, 8), ...[...pb].sort((x, y) => y[1] - x[1]).slice(0, 8)].map(([n]) => n))]
    .sort((x, y) => Math.max(pb.get(y) ?? 0, pa.get(y) ?? 0) - Math.max(pb.get(x) ?? 0, pa.get(x) ?? 0))
    .slice(0, 10);

  const nameBtn = (n: string) => `<button type="button" class="link" data-action="polity" data-name="${esc(n)}">${esc(n)}</button>`;
  const list = <T>(items: T[], row: (x: T) => string, empty: string) => {
    if (!items.length) return `<p class="small muted">${empty}</p>`;
    const extra = items.length - COMPARE_LIST_LIMIT;
    return `<ul class="change-list">${items.slice(0, COMPARE_LIST_LIMIT).map((x) => `<li>${row(x)}</li>`).join("")}</ul>${
      extra > 0 ? `<p class="small muted">and ${extra} more</p>` : ""
    }`;
  };
  const mkm = (km2: number) => (km2 >= 1_000_000 ? `${(km2 / 1_000_000).toFixed(1)}M` : `${Math.round(km2 / 1000)}k`);

  render(
    ctx,
    `<h2>${ya} → ${yb}</h2>
    <p class="muted">What changed between the first map (${ya}) and the second (${yb}). The two maps move together.</p>
    <dl class="stats">
      <div><dt>Appeared</dt><dd>${appeared.length}</dd></div>
      <div><dt>Disappeared</dt><dd>${vanished.length}</dd></div>
      <div><dt>Changed ruler</dt><dd>${newRuler.length}</dd></div>
    </dl>

    <section>
      <h3>Largest powers</h3>
      <table class="powers">
        <thead><tr><th scope="col">Power</th><th scope="col">${ya}</th><th scope="col">${yb}</th></tr></thead>
        <tbody>${top
          .map((n) => `<tr><th scope="row">${nameBtn(n)}</th><td>${pa.has(n) ? mkm(pa.get(n)!) : "—"}</td><td>${pb.has(n) ? mkm(pb.get(n)!) : "—"}</td></tr>`)
          .join("")}</tbody>
      </table>
      <p class="small muted">Area in km², including ruled territories.</p>
    </section>

    <section>
      <h3>Changed ruler</h3>
      ${list(newRuler, (x) => `${nameBtn(x.name)}<span class="small muted block">${esc(x.a.sovereign)} → ${esc(x.b.sovereign)}</span>`, "No territory changed hands under the same name.")}
    </section>
    <section>
      <h3>Grew or shrank</h3>
      ${list(resized, (x) => `${nameBtn(x.name)} <span class="small ${x.delta > 0 ? "up" : "down"}">${x.delta > 0 ? "+" : "−"}${formatArea(Math.abs(x.delta))}</span>`, "No large changes in area.")}
    </section>
    <section>
      <h3>New on the map in ${yb}</h3>
      ${list(appeared, ([n, h]) => `${nameBtn(n)} <span class="small muted">${formatArea(h.km2)}</span>`, "None.")}
    </section>
    <section>
      <h3>Gone from the map by ${yb}</h3>
      ${list(vanished, ([n, h]) => `${nameBtn(n)} <span class="small muted">${formatArea(h.km2)}</span>`, "None.")}
    </section>
    <p class="small caveat">Territories are matched by name. A renamed state shows up as one that disappeared and one that appeared, and areas are approximate.</p>`,
    focus,
  );
}

// --- Drawings and the Surveyor ---------------------------------------------------

/** The pen drawing as an inline image, in the current theme. */
function drawingImg(kind: string, cls = "drawing-thumb") {
  const t = currentTheme();
  const svg = drawingSvg(kind, t.label, t.wash, t.clay ? t.ring : "none", 3, t.clay);
  return `<img class="${cls}" alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" />`;
}

/** A photograph or artwork with its caption and credit. */
function photoFigure(img: AtlasImage, caption: string, cls: string) {
  return `<figure class="${cls}"><img src="${esc(img.thumb)}" alt="" loading="lazy" width="${img.w}" height="${img.h}" />
    <figcaption>${esc(caption)}<span class="credit">${creditHtml(img, esc)}</span></figcaption></figure>`;
}

/** A list thumbnail: the place's photograph where there is one, else its drawing. */
function thumb(d: Drawing) {
  const img = drawingImage(d.id);
  return img ? `<img class="photo-thumb" alt="" loading="lazy" src="${esc(img.thumb)}" />` : drawingImg(d.kind);
}

function lookCloser(ctx: PanelContext) {
  const landmarks = ctx.drawings.filter((d) => d.cat === "landmark");
  const nature = ctx.drawings.filter((d) => d.cat === "nature");
  const culture = ctx.drawings.filter((d) => d.cat === "culture");
  const curiosities = ctx.drawings.filter((d) => d.cat === "curiosity").length;
  const list = (items: Drawing[]) =>
    `<ul class="drawing-list">${items
      .map((d) => `<li><button type="button" class="drawing-row" data-action="drawing" data-id="${esc(d.id)}">${thumb(d)}<span>${esc(d.name)}</span></button></li>`)
      .join("")}</ul>`;
  const s = ctx.surveyor;
  const surveyorLine = !s.spot
    ? ""
    : s.found
      ? `<p class="small">You found the Surveyor here, at ${esc(s.spot.place)}. <button type="button" class="link" data-action="drawing-surveyor">See what they found</button></p>`
      : `<p class="small">The Surveyor is hiding somewhere on this map. <button type="button" class="link" data-action="hint">Give me a hint</button></p>`;
  return `<section>
    <h3>Look closer</h3>
    <p class="small muted">${currentTheme().modern ? "Places" : "Drawings"} appear as you zoom in.${
      curiosities ? ` ${curiosities} curiosit${curiosities === 1 ? "y is" : "ies are"} hidden somewhere on this map, unlisted.` : ""
    }</p>
    ${surveyorLine}
    <p class="small muted">Surveyor found in ${s.count} of ${s.total} eras.</p>
    ${landmarks.length ? `<h4>Landmarks standing</h4>${list(landmarks)}` : ""}
    ${culture.length ? `<h4>Places and their culture</h4>${list(culture)}` : ""}
    ${nature.length ? `<h4>Nature in this era</h4>${list(nature)}` : ""}
  </section>`;
}

/** Ray-casting point-in-polygon, for "where was this, in this year?". */
function inside([x, y]: [number, number], geom: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polys.some((rings) => {
    let hit = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
    }
    return hit;
  });
}

function territoryAt(ctx: PanelContext, lon: number, lat: number) {
  return ctx.data.borders.features.find((f) => inside([lon, lat], f.geometry))?.properties ?? null;
}

export function renderDrawing(ctx: PanelContext, d: Drawing, focus = false) {
  const where = territoryAt(ctx, d.lon, d.lat);
  const built = `${d.approx ? "c. " : ""}${formatYear(d.from)}`;
  const span = d.to === null ? `Since ${built}` : d.to === d.from ? built : `${built} – ${formatYear(d.to)}`;
  render(
    ctx,
    `${backButton}
    ${
      drawingImage(d.id)
        ? photoFigure(drawingImage(d.id)!, d.quip, "photo-hero")
        : `<figure class="drawing-hero">${drawingImg(d.kind, "drawing-large")}<figcaption>${esc(d.quip)}</figcaption></figure>`
    }
    <h2>${esc(d.name)}</h2>
    <p class="lede">${span}</p>
    <p>${esc(d.note)}</p>
    ${
      where
        ? `<p class="small muted">In ${formatYear(ctx.data.year)} this lay in <button type="button" class="link" data-action="polity" data-name="${esc(where.name)}">${esc(where.name)}</button>${
            where.sovereign !== where.name ? `, ruled by ${esc(where.sovereign)}` : ""
          }.</p>`
        : ""
    }
    <section aria-live="polite" id="wiki"><p class="muted">Loading Wikipedia summary…</p></section>`,
    focus,
  );
  eventArticle(d.wiki).then((w) => {
    if (current?.data !== ctx.data) return;
    fillWiki(w, null);
  });
}

export function renderSurveyor(ctx: PanelContext, focus = false) {
  const spot = ctx.surveyor.spot;
  if (!spot) return renderOverview(ctx, focus);
  const { count, total } = ctx.surveyor;
  render(
    ctx,
    `${backButton}
    <figure class="drawing-hero">${drawingImg("surveyor", "drawing-large")}
      <figcaption>Found. ${count === total ? "That was the last one, every era found." : `${count} of ${total} eras so far.`}</figcaption></figure>
    <h2>${esc(spot.place)}</h2>
    <p class="lede">${formatYear(ctx.data.year)}</p>
    <p>${esc(spot.note)}</p>
    <p class="small muted">The Surveyor hides somewhere different in every era. Move along the timeline to keep looking.</p>
    <section aria-live="polite" id="wiki"><p class="muted">Loading Wikipedia summary…</p></section>`,
    focus,
  );
  eventArticle(spot.wiki).then((w) => {
    if (current?.data !== ctx.data) return;
    fillWiki(w, null);
  });
}

// --- Routes ---------------------------------------------------------------------

const ROUTE_MODE = { land: "Overland route", sea: "Sea route", air: "Air route" } as const;
const ROUTE_DRAWING = { land: "camel", sea: "galleon", air: "airliner" } as const;

export function renderRoute(ctx: PanelContext, r: RouteInfo, focus = false) {
  const span = `${formatYear(r.from)} – ${r.to === null ? "today" : formatYear(r.to)}`;
  render(
    ctx,
    `${backButton}
    <figure class="drawing-hero">${drawingImg(ROUTE_DRAWING[r.mode], "drawing-large")}</figure>
    <p class="eyebrow">${ROUTE_MODE[r.mode]}</p>
    <h2>${esc(r.name)}</h2>
    <p class="lede">${span}</p>
    <p>${esc(r.note)}</p>
    <p class="small muted">The dotted line traces the route approximately; the travellers along it are drawn in the style of the era.</p>
    <section aria-live="polite" id="wiki"><p class="muted">Loading Wikipedia summary…</p></section>`,
    focus,
  );
  eventArticle(r.wiki).then((w) => {
    if (current?.data !== ctx.data) return;
    fillWiki(w, null);
  });
}

// --- Cities and states ---------------------------------------------------------------

export function renderCity(ctx: PanelContext, c: City, focus = false) {
  const year = ctx.data.year;
  const then = cityNameAt(c, year);
  const where = territoryAt(ctx, c.lon, c.lat);
  const founded = c.undated ? null : `${c.approx ? "c. " : ""}${formatYear(c.from)}`;
  const formerNames = (c.names ?? []).filter(([, n]) => n !== c.name);
  render(
    ctx,
    `${backButton}
    <p class="eyebrow">${c.ancient ? "Ancient city" : "City"}</p>
    <h2>${esc(then)}</h2>
    ${then !== c.name ? `<p class="lede">Today ${esc(c.name)}</p>` : ""}
    <dl class="facts">
      <div><dt>${c.to !== null ? "Settled" : "Founded"}</dt><dd>${founded ?? '<span class="muted">Date not recorded</span>'}</dd></div>
      ${c.to !== null ? `<div><dt>Abandoned</dt><dd>${formatYear(c.to)}</dd></div>` : ""}
      ${c.pop && c.to === null ? `<div><dt>Population today</dt><dd>${c.pop.toLocaleString("en")}</dd></div>` : ""}
      ${where ? `<div><dt>In ${formatYear(year)}</dt><dd><button type="button" class="link" data-action="polity" data-name="${esc(where.name)}">${esc(where.name)}</button></dd></div>` : ""}
      ${formerNames.length ? `<div><dt>Earlier names</dt><dd>${formerNames.map(([until, n]) => `${esc(n)} <span class="small muted">until ${formatYear(until)}</span>`).join("<br>")}</dd></div>` : ""}
    </dl>
    <section aria-live="polite" id="wiki"><p class="muted">Loading Wikipedia summary…</p></section>`,
    focus,
  );
  polityArticle(c.name, c.qid).then((w) => {
    if (current?.data !== ctx.data) return;
    fillWiki(w, null);
  });
}

export function renderAdmin(ctx: PanelContext, a: AdminProps, focus = false) {
  const joined =
    a.country === "United States of America"
      ? `Joined the Union in ${a.from}`
      : a.country === "Canada"
        ? `Part of Canada since ${a.from}`
        : a.country === "Australia"
          ? `Established as a colony or territory in ${a.from}`
          : "Present-day boundaries";
  render(
    ctx,
    `${backButton}
    <p class="eyebrow">${esc(a.kind)} of ${esc(a.country)}</p>
    <h2>${esc(a.name)}</h2>
    <p class="lede">${joined}</p>
    <dl class="facts"><div><dt>Area</dt><dd>${formatArea(a.km2)}</dd></div></dl>
    <p class="small muted">State and province borders are drawn as they are today.</p>
    <section aria-live="polite" id="wiki"><p class="muted">Loading Wikipedia summary…</p></section>`,
    focus,
  );
  polityArticle(a.name, a.qid).then((w) => {
    if (current?.data !== ctx.data) return;
    fillWiki(w, null);
  });
}
