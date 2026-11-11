/* ─────────────────────────────────────────────────────────
 * THE PAGE CHECKS ITSELF
 *
 * A short list of promises this page makes, each tested in the
 * visitor's browser against the live document. Results are
 * whatever the browser measures: a check that fails shows as
 * failed, and one the browser cannot measure says so.
 * ───────────────────────────────────────────────────────── */

const LIMITS = {
  contrast: 4.5, // WCAG AA for body text
  tap: 44, // px, minimum height of a standalone control
  weightKb: 400, // transferred, first load
  settle: 2500, // ms after load before measuring, so late shifts are counted
};

type Status = "pass" | "fail" | "skip";

interface Result {
  name: string;
  status: Status;
  detail: string;
}

/* ── helpers ───────────────────────────────────────────── */

function luminance([r, g, b]: number[]) {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(b ?? 0);
}

function rgb(value: string) {
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return { channels: parts.slice(0, 3), alpha: parts.length > 3 ? (parts[3] ?? 1) : 1 };
}

function ratio(a: number[], b: number[]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The first opaque background behind an element. */
function backdrop(el: Element): number[] {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const bg = rgb(getComputedStyle(node).backgroundColor);
    if (bg.alpha > 0.99 && bg.channels.length === 3) return bg.channels;
  }
  return rgb(getComputedStyle(document.body).backgroundColor).channels;
}

function visible(el: Element) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

/* ── the checks ────────────────────────────────────────── */

function images(): Result {
  const all = [...document.querySelectorAll("img")];
  const missing = all.filter((img) => !img.hasAttribute("alt"));
  return {
    name: "Every image has a text alternative",
    status: missing.length ? "fail" : "pass",
    detail: `${all.length - missing.length} of ${all.length}`,
  };
}

function links(): Result {
  const all = [...document.querySelectorAll("a")];
  const dead = all.filter((a) => {
    const href = a.getAttribute("href") ?? "";
    return href === "" || href === "#" || href.startsWith("javascript:");
  });
  return {
    name: "Every link goes somewhere",
    status: dead.length ? "fail" : "pass",
    detail: `${all.length - dead.length} of ${all.length}`,
  };
}

function contrast(): Result {
  // Every element in the letter that directly holds text.
  const holders = [...document.querySelectorAll(".letter *")].filter(
    (el) =>
      visible(el) &&
      !el.closest("[aria-hidden='true'], .sr") &&
      [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
  );
  let lowest = Number.POSITIVE_INFINITY;
  for (const el of holders) {
    const colour = rgb(getComputedStyle(el).color);
    if (colour.channels.length !== 3) continue;
    lowest = Math.min(lowest, ratio(colour.channels, backdrop(el)));
  }
  return {
    name: `Text contrast is at least ${LIMITS.contrast}:1`,
    status: lowest >= LIMITS.contrast ? "pass" : "fail",
    detail: `lowest ${lowest.toFixed(1)}:1, ${holders.length} elements`,
  };
}

function taps(): Result {
  const all = [...document.querySelectorAll("[data-tap]")].filter(visible);
  const small = all.filter((el) => el.getBoundingClientRect().height < LIMITS.tap - 0.5);
  return {
    name: `Buttons are at least ${LIMITS.tap}px tall`,
    status: small.length ? "fail" : "pass",
    detail: `${all.length - small.length} of ${all.length}`,
  };
}

function offersMatch(expected: { name: string; note: string }[]): Result {
  const wrong = expected.filter(({ name, note }) => {
    const row = document.querySelector(`[data-offer="${CSS.escape(name)}"]`)?.closest("li");
    return row?.querySelector("[data-offer-note]")?.textContent?.trim() !== note;
  });
  const shown = document.querySelectorAll("[data-offer]").length;
  return {
    name: "Offers on screen match the offer list",
    status: wrong.length || shown !== expected.length ? "fail" : "pass",
    detail: `${expected.length - wrong.length} of ${expected.length}`,
  };
}

function fonts(): Result {
  const ok = document.fonts.check('1em "Source Serif Pro"') && document.fonts.check('italic 1em "Source Serif Pro"');
  return { name: "Typefaces loaded", status: ok ? "pass" : "fail", detail: ok ? "serif roman and italic" : "fell back" };
}

function motion(): Result {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) return { name: "Your motion preference is respected", status: "pass", detail: "no preference set, motion on" };
  const running = document.getAnimations().filter((a) => a.playState === "running").length;
  return {
    name: "Your motion preference is respected",
    status: running ? "fail" : "pass",
    detail: `reduced motion, ${running} animations running`,
  };
}

function shift(total: number | null): Result {
  if (total === null) return { name: "Nothing moved after it appeared", status: "skip", detail: "this browser does not report layout shift" };
  return {
    name: "Nothing moved after it appeared",
    status: total < 0.01 ? "pass" : "fail",
    detail: `layout shift ${total.toFixed(3)}`,
  };
}

function weight(dev: boolean): Result {
  const name = `First load is under ${LIMITS.weightKb} kB`;
  if (dev) return { name, status: "skip", detail: "development build, not measured" };
  const entries = [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")] as PerformanceResourceTiming[];
  const bytes = entries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
  if (!bytes) return { name, status: "skip", detail: "served from cache, nothing transferred" };
  const kb = bytes / 1024;
  return { name, status: kb < LIMITS.weightKb ? "pass" : "fail", detail: `${kb.toFixed(0)} kB transferred` };
}

/* ── run and render ────────────────────────────────────── */

export function startChecks() {
  const root = document.querySelector<HTMLDetailsElement>("[data-checks]");
  const list = root?.querySelector<HTMLElement>("[data-checks-list]");
  const summary = root?.querySelector<HTMLElement>("[data-checks-summary]");
  if (!root || !list || !summary) return;

  const expected = JSON.parse(root.dataset.expected ?? "[]") as { name: string; note: string }[];
  const dev = root.hasAttribute("data-dev");

  // Layout shift has to be watched from the start; it cannot be asked for afterwards.
  let shifted: number | null = null;
  try {
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      shifted = 0;
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) shifted = (shifted ?? 0) + entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    }
  } catch {
    shifted = null;
  }

  function run() {
    if (!list || !summary || !root) return;
    const results = [images(), links(), contrast(), taps(), offersMatch(expected), fonts(), motion(), shift(shifted), weight(dev)];
    const counted = results.filter((r) => r.status !== "skip");
    const passed = counted.filter((r) => r.status === "pass").length;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    root.dataset.state = passed === counted.length ? "pass" : "fail";
    summary.textContent = `This page checks itself: ${passed} of ${counted.length} pass in your browser, ${time}.`;
    list.replaceChildren(
      ...results.map(({ name, status, detail }) => {
        const item = document.createElement("li");
        item.dataset.status = status;
        const label = document.createElement("span");
        label.textContent = name;
        const value = document.createElement("span");
        value.textContent = status === "skip" ? `not measured: ${detail}` : detail;
        item.append(label, value);
        return item;
      })
    );
  }

  const settle = () => window.setTimeout(run, LIMITS.settle);
  if (document.readyState === "complete") settle();
  else window.addEventListener("load", settle, { once: true });

  // Opening the list re-runs it, so what is shown is never stale.
  root.addEventListener("toggle", () => {
    if (root.open) run();
  });
}
