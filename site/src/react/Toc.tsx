/** "On this page": the doc's headings, with the one you're reading marked as you scroll. */
import { useEffect, useState } from "react";
import { followLink } from "./Prose.tsx";

export function Toc({ items }: { items: Array<{ id: string; text: string; depth: number }> }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!items.length) return;
    const els = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => !!x);
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = els.find((el) => seen.get(el.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-72px 0px -60% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [items]);
  if (!items.length) return null;
  return (
    <nav className="toc" aria-label="On this page">
      <p className="toc-title">On this page</p>
      <ul>
        {items.map((i) => (
          <li key={i.id} data-depth={i.depth}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              onClick={(e) => {
                if (followLink(`${location.pathname}#${i.id}`)) {
                  e.preventDefault();
                  history.replaceState(null, "", `#${i.id}`);
                }
              }}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
