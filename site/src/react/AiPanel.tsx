/**
 * "Learn it and write it with any AI", as one terminal pane in the page's editor style: pick how you
 * work with an assistant, and get the exact lines to run or paste, each with its own copy button.
 * Command output is what the CLI really prints.
 */
import { Check, Copy } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";
import pkg from "../../../packages/layr/package.json";

type Line = { kind: "note" | "cmd" | "out" | "ask" | "text"; text: string };

const WAYS: Array<{ id: string; tab: string; lines: Line[] }> = [
  {
    id: "agent",
    tab: "Coding agent",
    lines: [
      { kind: "note", text: "Once per project: the rules, the canonical form, every widget and diagnostic" },
      { kind: "cmd", text: "layr skills install" },
      { kind: "out", text: `✓ LAYR Skill ${pkg.version} → .claude/skills/layr` },
      { kind: "out", text: "✓ added the LAYR section in AGENTS.md" },
      { kind: "note", text: "Then ask for anything. The agent checks its own work with the compiler" },
      { kind: "ask", text: "Build a pricing page in LAYR with three plans that stack on phones. Run layr format and layr analyze --json, and fix every diagnostic before you finish." },
    ],
  },
  {
    id: "mcp",
    tab: "MCP client",
    lines: [
      { kind: "note", text: "Tools for any MCP client: widgets, diagnostics, format, analyze, addons" },
      { kind: "cmd", text: "claude mcp add layr -- npx layr mcp" },
      { kind: "note", text: "Any other client: add it to its MCP config" },
      { kind: "text", text: '{ "mcpServers": { "layr": { "command": "npx", "args": ["layr", "mcp"] } } }' },
      { kind: "note", text: "The assistant now verifies LAYR instead of guessing it" },
      { kind: "ask", text: "Why does my Row stack on phones? Check it with the layr tools." },
    ],
  },
  {
    id: "chat",
    tab: "Chat assistant",
    lines: [
      { kind: "note", text: "The whole documentation, as one text file (every page is also Markdown at its URL + .md)" },
      { kind: "text", text: "https://layr.dynshift.com/llms-full.txt" },
      { kind: "note", text: "Paste it into any assistant, and learn by building" },
      { kind: "ask", text: "Read https://layr.dynshift.com/llms-full.txt. Then teach me LAYR by building a small profile card with me, one concept at a time." },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="term-copy"
      data-done={done ? "" : undefined}
      aria-label={done ? "Copied" : `Copy ${text.slice(0, 40)}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? <Check size={14} weight="bold" /> : <Copy size={14} />}
    </button>
  );
}

/** The prompt types itself in when a tab opens: quick, and instant for readers who ask for less motion. */
function useTyped(text: string): string {
  const [n, setN] = useState(text.length);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(text.length);
    setN(0);
    const start = performance.now();
    const ms = Math.min(900, 12 * text.length);
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setN(Math.round(text.length * (1 - (1 - k) ** 2)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return text.slice(0, n);
}

function Ask({ text }: { text: string }) {
  const shown = useTyped(text);
  return (
    <>
      <span className="term-mark">›</span>
      <span className="term-text">
        {shown}
        {shown.length < text.length ? <i className="term-caret" /> : null}
      </span>
    </>
  );
}

export function AiPanel() {
  const [way, setWay] = useState(WAYS[0]?.id ?? "agent");
  const w = WAYS.find((x) => x.id === way) ?? (WAYS[0] as (typeof WAYS)[number]);
  return (
    <div className="term">
      <div className="term-bar" role="tablist" aria-label="How you work with AI">
        {WAYS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === way} onClick={() => setWay(x.id)}>
            {x.tab}
          </button>
        ))}
      </div>
      <div className="term-body" role="tabpanel" aria-label={w.tab}>
        {w.lines.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional within a tab
          <div key={`${w.id}-${i}`} className="term-line" data-kind={l.kind}>
            {l.kind === "note" ? (
              <span className="term-text"># {l.text}</span>
            ) : l.kind === "ask" ? (
              <Ask text={l.text} />
            ) : (
              <>
                <span className="term-mark">{l.kind === "cmd" ? "$" : ""}</span>
                <span className="term-text">{l.text}</span>
              </>
            )}
            {l.kind === "cmd" || l.kind === "ask" || l.kind === "text" ? <CopyButton text={l.text} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
