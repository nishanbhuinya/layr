/**
 * RichText's runs as React elements. The compiler checks the markup; this parses it again with the
 * values in place (they are text, never markup) and gives each run its style.
 */
import { lengthCss, NAMED_COLORS, parseRich, type RichNode, type RichSegment, type RichStyle } from "@layr-internal/model";
import { router } from "@layr-internal/runtime";
import { type CSSProperties, createElement, Fragment, type ReactNode } from "react";

/** A colour as written in markup: `#000`, a named colour, or a theme colour; `.N` is its opacity. */
function colorCss(c: { name: string; alpha: number }): string {
  const base = c.name.startsWith("#") ? c.name : (NAMED_COLORS[c.name] ?? `var(--layr-color-${c.name})`);
  return c.alpha >= 1 ? base : `color-mix(in srgb, ${base} ${Math.round(c.alpha * 100)}%, transparent)`;
}

function styleOf(s: RichStyle): CSSProperties {
  const css: CSSProperties = {};
  if (s.bold) css.fontWeight = 700;
  if (s.weight) css.fontWeight = s.weight;
  if (s.italic) css.fontStyle = "italic";
  const lines = [s.underline || s.link ? "underline" : "", s.strike ? "line-through" : ""].filter(Boolean);
  if (lines.length) css.textDecorationLine = lines.join(" ");
  if (s.color) css.color = colorCss(s.color);
  else if (s.link) css.color = "inherit";
  if (s.size !== undefined) css.fontSize = lengthCss(s.size, true);
  if (s.highlight) Object.assign(css, { backgroundColor: colorCss(s.highlight), padding: "0 .15em", borderRadius: ".2em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" });
  if (s.code) Object.assign(css, { fontFamily: "var(--layr-font-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)", fontSize: ".92em", backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)", padding: "0 .25em", borderRadius: ".25em" });
  return css;
}

function render(nodes: RichNode[], key: string): ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}.${i}`;
    if (n.t === "text") return n.s;
    if (n.t === "br") return createElement("br", { key: k });
    const kids = render(n.kids, k);
    const style = styleOf(n.style);
    if (n.style.link) {
      const to = n.style.link;
      const internal = to.startsWith("/") && !to.startsWith("//");
      return createElement(
        "a",
        {
          key: k,
          href: internal ? router.hrefFor(to) : to,
          style,
          onClick: internal
            ? (e: { preventDefault(): void; metaKey: boolean; ctrlKey: boolean }) => {
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                router.go(to);
              }
            : undefined,
        },
        kids,
      );
    }
    return createElement(n.style.code ? "code" : "span", { key: k, style }, kids);
  });
}

/** `richText(['Hi ', { value: name }, ' (red)[!]'])`: the runs of a RichText string. */
export function richText(segments: RichSegment[]): ReactNode {
  const { paras } = parseRich(segments);
  if (paras.length <= 1) return createElement(Fragment, null, ...render(paras[0] ?? [], "p0"));
  // Paragraphs inside the RichText's <p>: blocks with a gap between them.
  return createElement(
    Fragment,
    null,
    ...paras.map((p, i) => createElement("span", { key: `p${i}`, style: { display: "block", marginTop: i ? "0.75em" : undefined } }, ...render(p, `p${i}`))),
  );
}
