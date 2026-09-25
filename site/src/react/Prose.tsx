/**
 * Renders build-time HTML (docs, READMEs, reference entries). In-site links navigate without a
 * reload, and code blocks get a working Copy button.
 */
import { Check, Copy } from "@phosphor-icons/react/ssr";
import { router } from "@dynshift/layr/runtime";
import { type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { decodeCode } from "../lib/runner.ts";
import { Live } from "./Live.tsx";

export async function copyText(text: string, button: HTMLElement, label = "Copy") {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
    button.setAttribute("data-done", "");
  } catch {
    button.textContent = "Select and copy";
  }
  setTimeout(() => {
    button.textContent = label;
    button.removeAttribute("data-done");
  }, 1600);
}

/** Follows an in-site link without reloading; returns false when the browser should handle it. */
export function followLink(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || /\.(txt|json|xml|md)(#|$)/.test(href)) return false;
  const [path, hash] = href.split("#") as [string, string | undefined];
  if (path === "/playground" && hash) return false;
  if (path && path !== router.location.peek().path) router.go(path);
  if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
  else if (path) window.scrollTo(0, 0);
  return true;
}

/** Build-time HTML with working links and copy buttons; `className` sets how it is styled. */
/** Live previews mounted into generated HTML, by their placeholder element. */
const LIVE_ROOTS = new WeakMap<HTMLElement, { root: Root; codeHtml: string; unmount?: ReturnType<typeof setTimeout> }>();

export function Html({ html, className }: { html: string; className?: string }) {
  const onClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const copy = target.closest("button.copy");
    if (copy) {
      const code = copy.closest(".code")?.querySelector("pre")?.textContent ?? "";
      void copyText(code, copy as HTMLElement);
      return;
    }
    const a = target.closest("a");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    if (followLink(a.getAttribute("href") ?? "")) e.preventDefault();
  }, []);
  const ref = useRef<HTMLDivElement>(null);
  // Runnable snippets become live examples once the page is interactive.
  useEffect(() => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>(".live[data-run]") ?? [])];
    for (const el of els) {
      // A re-run (same HTML) reuses the element's root and its original code markup.
      let mounted = LIVE_ROOTS.get(el);
      if (!mounted) {
        mounted = { root: createRoot(el), codeHtml: el.innerHTML };
        LIVE_ROOTS.set(el, mounted);
      }
      clearTimeout(mounted.unmount);
      mounted.root.render(<Live code={decodeCode(el.dataset.run ?? "")} src={el.dataset.src ? decodeCode(el.dataset.src) : undefined} codeHtml={mounted.codeHtml} playground={el.dataset.play ?? "/playground"} />);
    }
    return () => {
      for (const el of els) {
        const m = LIVE_ROOTS.get(el);
        if (!m) continue;
        m.unmount = setTimeout(() => {
          m.root.unmount();
          LIVE_ROOTS.delete(el);
        });
      }
    };
  }, [html]);
  // biome-ignore lint/a11y/useKeyWithClickEvents: delegation for the real links and buttons inside the HTML
  // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML generated at build time from the repository's own Markdown
  return <div ref={ref} className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Prose({ html }: { html: string }) {
  return <Html html={html} className="prose" />;
}

/**
 * Build-time highlighted code without prose styling (reference pages, home sections).
 * `scroll` caps it at a height and scrolls the rest; `fit` takes only the height its row gives it.
 */
export function Code({ html, scroll, fit }: { html: string; scroll?: boolean; fit?: boolean }) {
  return <Html html={html} className={`code-bare${scroll ? " code-scroll" : ""}${fit ? " code-fit" : ""}`} />;
}

/** The install command with a copy button. */
export function Command({ command }: { command: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="cmd">
      <code>{command}</code>
      <button
        type="button"
        data-done={done ? "" : undefined}
        aria-label={done ? "Copied" : `Copy: ${command}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setDone(true);
            setTimeout(() => setDone(false), 1600);
          } catch {}
        }}
      >
        {done ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}

/** Terminal output (from the real compiler at build time), with severities and carets coloured. */
export function Console({ text }: { text: string }) {
  return (
    <pre className="console">
      {text.split("\n").map((line, i) => {
        const key = `${i}-${line}`;
        const sev = line.match(/^(error|warning) (L\d+)(:.*)$/);
        if (sev)
          return (
            <div key={key}>
              <span className="sev-error">
                {sev[1]} {sev[2]}
              </span>
              {sev[3]}
            </div>
          );
        if (/^\s+\|\s+\^+/.test(line)) return <div key={key} className="caret">{line}</div>;
        if (/^\s+-->/.test(line)) return <div key={key} className="arrow">{line}</div>;
        return <div key={key}>{line || " "}</div>;
      })}
    </pre>
  );
}
