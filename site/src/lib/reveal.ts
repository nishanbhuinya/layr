/**
 * Home-page sections rise into view once, the first time they scroll in: a marketing page read top
 * to bottom, so the motion is seen once per section, never on repeat. Anything already on screen
 * when a section appears (the first paint, a prerendered page) is shown as is, never hidden.
 */
const seen = new WeakSet<Element>();

const io =
  typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            (e.target as HTMLElement).setAttribute("data-in", "");
            io?.unobserve(e.target);
          }
        },
        { rootMargin: "0px 0px -12% 0px" },
      );

function scan() {
  for (const band of document.querySelectorAll<HTMLElement>(".band")) {
    if (seen.has(band)) continue;
    seen.add(band);
    if (!io || band.getBoundingClientRect().top < innerHeight) continue;
    band.setAttribute("data-reveal", "");
    io.observe(band);
  }
}

if (typeof window !== "undefined") {
  // At most one scan per frame, and only on pages that have sections (hovering the studio
  // redraws its overlay constantly; that must cost nothing here).
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  };
  new MutationObserver((records) => {
    if (records.some((r) => r.target instanceof Element && !r.target.closest(".studio, .live-box"))) queue();
  }).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener("DOMContentLoaded", queue);
}
