/* ─────────────────────────────────────────────────────────
 * HOMEPAGE MOTION STORYBOARD
 *
 * The page is a letter with one image. Everything here is an
 * enhancement: without JS, or with reduced motion, it renders
 * complete and still.
 *
 * INTRO (once per session; keyframes in home.css)
 *      0ms   headline lines rise from behind their baselines
 *    250ms   the halftone A starts to grow in        (field.ts)
 *    420ms   the line under the headline fades up
 *    540ms   the card fades up
 *
 * HEADLINE WORD (loop, paused while the tab is hidden)
 *  every 2800ms   the italic word rolls to the next one
 *
 * THE FIELD                                           (field.ts)
 *   drifts always, darkens with scroll, answers the pointer
 *
 * SELF-CHECKS                                         (checks.ts)
 *   2500ms after load the page tests itself and reports
 * ───────────────────────────────────────────────────────── */

import { startChecks } from "./checks";
import { startField } from "./field";

const CYCLE = {
  hold: 2800, // how long each word stays up
};

const COPY = {
  feedback: 1600, // how long "Copied" stays up
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

startChecks(); // first, so its layout-shift observer sees everything
startField();

/* ── Headline word ─────────────────────────────────────── */

const words = [...document.querySelectorAll<HTMLElement>(".cycle em")];

if (words.length > 1 && !reduceMotion) {
  let active = 0;
  let timer: number | undefined;

  const next = () => {
    const from = words[active];
    active = (active + 1) % words.length;
    const to = words[active];
    if (!from || !to) return;
    for (const word of words) word.classList.remove("is-off");
    from.classList.remove("is-on");
    from.classList.add("is-off");
    to.classList.add("is-on");
  };

  const schedule = () => {
    window.clearTimeout(timer);
    if (document.hidden) return;
    timer = window.setTimeout(() => {
      next();
      schedule();
    }, CYCLE.hold);
  };

  schedule();
  document.addEventListener("visibilitychange", schedule);
}

/* ── Copy the address ──────────────────────────────────── */

const copy = document.querySelector<HTMLButtonElement>("[data-copy]");
const copyStatus = document.querySelector<HTMLElement>("[data-copy-status]");
if (copy) {
  let reset: number | undefined;
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copy.dataset.copy ?? "");
    } catch {
      return; // No clipboard access: the address is on screen and the mail link still works.
    }
    copy.classList.add("is-done");
    if (copyStatus) copyStatus.textContent = "Email address copied";
    window.clearTimeout(reset);
    reset = window.setTimeout(() => {
      copy.classList.remove("is-done");
      if (copyStatus) copyStatus.textContent = "";
    }, COPY.feedback);
  });
}
