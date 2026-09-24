/**
 * Google Fonts for LAYR. Every family is a font value:
 *
 *   import { GoogleFonts } from '@dynshift/layr-google-fonts'
 *   Text(.config(font: GoogleFonts.Fraunces, weight: 600) .obj('Hello'))
 *
 * `GoogleFonts.PlayfairDisplay` names "Playfair Display"; `GoogleFonts.font('M PLUS 1p', …)` takes any
 * name and options. Reading a family adds its stylesheet to the page once (in the browser only);
 * `href(...)` gives the same URL for a `<link>` in your HTML head, so prerendered pages start loading
 * the files before any script runs.
 */

const API = "https://fonts.googleapis.com/css2";

/** Words Google spells with inner capitals, kept whole when a key is split into words. */
const WORDS = ["JetBrains", "BioRhyme", "McLaren", "MedievalSharp", "UnifrakturCook", "UnifrakturMaguntia", "LXGW", "ZCOOL"];

/** "PlayfairDisplay" → "Playfair Display", "IBMPlexSans" → "IBM Plex Sans", "JetBrainsMono" → "JetBrains Mono". */
export function familyName(key) {
  const kept = [];
  let k = key;
  for (const w of WORDS) {
    if (!k.includes(w)) continue;
    kept.push(w);
    k = k.replace(w, ` \u0000${kept.length - 1}\u0000 `);
  }
  return k
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\u0000(\d+)\u0000/g, (_m, i) => kept[Number(i)])
    .replace(/\s+/g, " ")
    .trim();
}

/** The generic family a name suggests, used until the font arrives (and if it never does). */
function fallbackFor(family) {
  if (/\bMono\b|\bCode\b/i.test(family)) return "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  if (/\bSerif\b/i.test(family) && !/\bSans\b/i.test(family)) return "ui-serif, Georgia, serif";
  if (/\b(Fraunces|Playfair|Lora|Merriweather|Garamond|Caslon|Baskerville|Crimson|Libre Bodoni|DM Serif|Newsreader|Instrument Serif)\b/i.test(family)) return "ui-serif, Georgia, serif";
  return "system-ui, sans-serif";
}

/**
 * The css2 URL for one family. With `weights`, exactly those; otherwise the full variable range,
 * which static families reject, so the loader then retries with the regular weight only.
 */
export function familyQuery(family, { weights, italic = false } = {}) {
  const name = family.trim().replace(/ +/g, "+");
  if (weights === "regular") return `family=${name}${italic ? ":ital@0;1" : ""}`;
  const list = weights?.length ? [...weights].sort((a, b) => a - b).join(";") : "100..900";
  if (!italic) return `family=${name}:wght@${list}`;
  const both = weights?.length ? [...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)].join(";") : "0,100..900;1,100..900";
  return `family=${name}:ital,wght@${both}`;
}

/** A stylesheet URL for one or more families (for a `<link rel="stylesheet">` in the head). */
export function href(...families) {
  const parts = families.map((f) => (typeof f === "string" ? familyQuery(f) : familyQuery(f.family, f)));
  return `${API}?${parts.join("&")}&display=swap`;
}

const requested = new Set();

/**
 * Adds the family's stylesheet once. The API refuses a weight range wider than the family's axis
 * (and any weight a static family lacks), so a refused full range falls back to one stylesheet per
 * weight: the ones that exist load, the rest fail harmlessly.
 */
function load(family, options) {
  if (typeof document === "undefined" || requested.has(family)) return;
  requested.add(family);
  if (!document.querySelector('link[href="https://fonts.gstatic.com"]')) {
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.gstatic.com";
    pre.crossOrigin = "";
    document.head.appendChild(pre);
  }
  const add = (opts, onerror) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${API}?${familyQuery(family, opts)}&display=swap`;
    link.dataset.layrFont = family;
    link.onerror = () => {
      link.remove();
      onerror?.();
    };
    document.head.appendChild(link);
  };
  const weights = options.weights?.length ? options.weights : [100, 200, 300, 400, 500, 600, 700, 800, 900];
  add(options, () => {
    for (const w of weights) add({ ...options, weights: [w] });
  });
}

/**
 * One family as a LAYR font value. Options: `weights` (e.g. `[400, 700]`; default every weight a
 * variable family has), `italic`, and `fallback` (the generic stack shown until it loads).
 */
export function font(family, options = {}) {
  load(family, options);
  return { $: "font", family, fallback: options.fallback ?? fallbackFor(family), toString: () => family };
}

/** Load families up front, e.g. the ones the first screen uses. */
export function preload(...families) {
  for (const f of families) font(typeof f === "string" ? f : f.family, typeof f === "string" ? {} : f);
}

/** `GoogleFonts.Inter`, `GoogleFonts.SpaceGrotesk`, …, plus `font`, `href` and `preload`. */
export const GoogleFonts = new Proxy(
  { font, href, preload },
  {
    get(target, key) {
      if (typeof key !== "string") return undefined;
      if (key in target) return target[key];
      return font(familyName(key));
    },
  },
);

export default GoogleFonts;
