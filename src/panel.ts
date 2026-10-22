import type { HistoryEvent, Meta, YearData } from "./types";
import { EVENT_TYPES, PRECISION_LABEL, escapeHtml as esc, formatArea, formatEventDate, formatYear } from "./format";
import { eventArticle, polityArticle, type WikiSummary } from "./wiki";

export interface PanelContext {
  meta: Meta;
  data: YearData;
  /** Year of the next snapshot, or null for the latest. */
  nextYear: number | null;
  eraEvents: HistoryEvent[];
  actions: {
    selectPolity(name: string, year?: number): void;
    selectEvent(id: string): void;
    goToYear(year: number): void;
    showOverview(): void;
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
    const { action, name, id, year } = el.dataset;
    if (action === "polity") current.actions.selectPolity(name!, year ? Number(year) : undefined);
    else if (action === "event") current.actions.selectEvent(id!);
    else if (action === "year") current.actions.goToYear(Number(year));
    else if (action === "overview") current.actions.showOverview();
  });
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

function render(ctx: PanelContext, html: string, focus = false) {
  current = ctx;
  const el = panel();
  el.innerHTML = html;
  el.scrollTop = 0;
  if (focus) el.focus({ preventScroll: true });
}

const backButton = `<button type="button" class="back" data-action="overview">← Overview</button>`;

function eventButton(e: HistoryEvent) {
  const t = EVENT_TYPES[e.type];
  return `<li><button type="button" class="event-row" data-action="event" data-id="${esc(e.id)}">
    <span class="dot" style="background:${t.color}" aria-hidden="true"></span>
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

export function renderOverview(ctx: PanelContext, focus = false) {
  const { data, meta, eraEvents } = ctx;
  const idx = meta.years.findIndex((y) => y.year === data.year);
  const sovereigns = new Set(data.borders.features.map((f) => f.properties.sovereign));
  const legend = Object.values(EVENT_TYPES)
    .map((t) => `<li><span class="dot" style="background:${t.color}" aria-hidden="true"></span>${t.label}</li>`)
    .join("");

  render(
    ctx,
    `<h2>The world in ${formatYear(data.year)}</h2>
    <p class="muted">Snapshot ${idx + 1} of ${meta.years.length}. ${
      ctx.nextYear === null ? "This is the most recent map." : `The next map is ${formatYear(ctx.nextYear)}.`
    }</p>
    <dl class="stats">
      <div><dt>Territories</dt><dd>${data.borders.features.length}</dd></div>
      <div><dt>Sovereign powers</dt><dd>${sovereigns.size}</dd></div>
      <div><dt>Known capitals</dt><dd>${data.capitals.features.length}</dd></div>
    </dl>
    <section>
      <h3>Events, ${eraRange(ctx)}</h3>
      ${
        eraEvents.length
          ? `<ul class="event-list">${eraEvents.map(eventButton).join("")}</ul>`
          : `<p class="muted">No events recorded for this period yet.</p>`
      }
    </section>
    <section>
      <h3>Reading the map</h3>
      <ul class="legend">${legend}</ul>
      <p class="muted small">Territories ruled by the same power share a colour. Dashed outlines mark approximate borders. Select any territory or event to learn more.</p>
    </section>
    ${sourcesNote}`,
    focus,
  );
}

const sourcesNote = `<section class="sources">
  <h3>About the data</h3>
  <p class="small muted">Borders come from the open <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener">historical-basemaps</a> project, which its authors describe as a work in progress. Capitals come from Wikidata, and descriptions from Wikipedia. Events are a starter set that is still being reviewed. Check important facts against the linked sources.</p>
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
    <section>
      <h3>On the map</h3>
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

// --- Event ------------------------------------------------------------------

export function renderEvent(ctx: PanelContext, e: HistoryEvent, focus = false) {
  const t = EVENT_TYPES[e.type];
  render(
    ctx,
    `${backButton}
    <p class="eyebrow"><span class="dot" style="background:${t.color}" aria-hidden="true"></span>${t.label}</p>
    <h2>${esc(e.title)}</h2>
    <p class="lede">${formatEventDate(e)}${e.approx ? ` <span class="small muted">(approximate or traditional date)</span>` : ""}</p>
    <p>${esc(e.summary)}</p>
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
