import type { HistoryEvent, Meta } from "./types";
import { escapeHtml as esc, formatEventDate, formatYear } from "./format";

type Result =
  | { kind: "polity"; name: string; years: number[] }
  | { kind: "event"; event: HistoryEvent };

export interface SearchHandlers {
  onPolity(name: string, years: number[]): void;
  onEvent(e: HistoryEvent): void;
}

const MAX_RESULTS = 12;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Accessible combobox over every polity name in the dataset plus the events. */
export function initSearch(meta: Meta, events: HistoryEvent[], handlers: SearchHandlers) {
  const input = document.getElementById("search-input") as HTMLInputElement;
  const list = document.getElementById("search-results") as HTMLUListElement;
  const polities = Object.entries(meta.appearances).map(([name, years]) => ({ name, years, key: fold(name) }));
  const evs = events.map((e) => ({ e, key: fold(e.title) }));
  const eventIds = new Set(events.map((e) => e.id));
  let results: Result[] = [];
  let active = -1;

  function search(q: string): Result[] {
    const k = fold(q.trim());
    if (k.length < 2) return [];
    const score = (key: string) => (key.startsWith(k) ? 0 : key.includes(" " + k) ? 1 : key.includes(k) ? 2 : -1);
    const ps = polities
      .map((p) => ({ p, s: score(p.key) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s || b.p.years.length - a.p.years.length)
      .map(({ p }): Result => ({ kind: "polity", name: p.name, years: p.years }));
    const es = evs
      .map((x) => ({ e: x.e, s: score(x.key) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s || (a.e.source ? 1 : 0) - (b.e.source ? 1 : 0) || (b.e.notability ?? 0) - (a.e.notability ?? 0))
      .map(({ e }): Result => ({ kind: "event", event: e }));
    // Interleave so a few events surface even when many polities match.
    return [...ps.slice(0, MAX_RESULTS - Math.min(es.length, 4)), ...es].slice(0, MAX_RESULTS);
  }

  function describe(r: Result) {
    if (r.kind === "event") return { title: r.event.title, sub: `Event · ${formatEventDate(r.event)}` };
    const first = r.years[0];
    const last = r.years[r.years.length - 1];
    return { title: r.name, sub: `Territory · ${first === last ? formatYear(first) : `${formatYear(first)} – ${formatYear(last)}`}` };
  }

  function draw() {
    list.innerHTML = results
      .map((r, i) => {
        const d = describe(r);
        return `<li role="option" id="sr-${i}" aria-selected="${i === active}" data-i="${i}">
          <span class="sr-title">${esc(d.title)}</span><span class="sr-sub">${esc(d.sub)}</span></li>`;
      })
      .join("");
    const open = results.length > 0;
    list.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
    if (active >= 0) input.setAttribute("aria-activedescendant", `sr-${active}`);
    else input.removeAttribute("aria-activedescendant");
    list.querySelector(`[aria-selected="true"]`)?.scrollIntoView({ block: "nearest" });
  }

  function close() {
    results = [];
    active = -1;
    draw();
  }

  function choose(i: number) {
    const r = results[i];
    if (!r) return;
    input.value = "";
    close();
    input.blur();
    if (r.kind === "event") handlers.onEvent(r.event);
    else handlers.onPolity(r.name, r.years);
  }

  input.addEventListener("input", () => {
    results = search(input.value);
    active = results.length ? 0 : -1;
    draw();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && results.length) {
      active = (active + 1) % results.length;
      draw();
      e.preventDefault();
    } else if (e.key === "ArrowUp" && results.length) {
      active = (active - 1 + results.length) % results.length;
      draw();
      e.preventDefault();
    } else if (e.key === "Enter" && active >= 0) {
      choose(active);
      e.preventDefault();
    } else if (e.key === "Escape") {
      input.value = "";
      close();
    }
  });
  // mousedown fires before blur, so the click lands before the list closes.
  list.addEventListener("mousedown", (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    if (li) {
      e.preventDefault();
      choose(Number(li.dataset.i));
    }
  });
  input.addEventListener("blur", () => setTimeout(close, 100));

  return {
    /** Makes more events searchable, e.g. once the Wikidata set has loaded. */
    addEvents(more: HistoryEvent[]) {
      for (const e of more) if (!eventIds.has(e.id)) eventIds.add(e.id), evs.push({ e, key: fold(e.title) });
    },
  };
}
