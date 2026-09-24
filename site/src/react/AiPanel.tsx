/**
 * "Learn it and write it with any AI": pick how you work with an assistant, and get exactly what
 * to run or paste, each with a copy button.
 */
import { ChatsCircle, Check, Copy, Plug, Sparkle } from "@phosphor-icons/react/ssr";
import { useState } from "react";

const WAYS = [
  {
    id: "agent",
    icon: Sparkle,
    title: "Coding agent",
    sub: "Claude Code, Codex, Cursor and others",
    body: "The LAYR Skill gives an agent the language's rules, its canonical form and a reference for every widget and diagnostic, generated from the compiler's own schema. It lands in .claude/skills/layr, AGENTS.md points every other agent at it, and it updates with your LAYR version.",
    blocks: [
      { label: "In your project", text: "layr skills install" },
      { label: "Then ask your agent", text: "Build a pricing page in LAYR with three plans that stack on phones. Run layr format and layr analyze --json, and fix every diagnostic before you finish." },
    ],
  },
  {
    id: "mcp",
    icon: Plug,
    title: "MCP client",
    sub: "Any assistant that speaks MCP",
    body: "layr mcp is a Model Context Protocol server over stdio. Its tools look up widgets, explain diagnostics, check and format snippets, analyze the project and search addons, so the assistant verifies LAYR instead of guessing it.",
    blocks: [
      { label: "Run in your project", text: "layr mcp" },
      { label: "Or add it to your client's MCP config", text: '{\n  "mcpServers": {\n    "layr": { "command": "npx", "args": ["layr", "mcp"] }\n  }\n}' },
    ],
  },
  {
    id: "chat",
    icon: ChatsCircle,
    title: "Chat assistant",
    sub: "Learn LAYR by asking",
    body: "The whole documentation is one text file. Give it to any assistant and ask it anything, from what Design Scale is to why a row stacked. Every docs page is also Markdown at its URL plus .md.",
    blocks: [
      { label: "The docs, as one file", text: "https://layr.dynshift.com/llms-full.txt" },
      { label: "A first question", text: "Read https://layr.dynshift.com/llms-full.txt. Then teach me LAYR by building a small profile card with me, one concept at a time." },
    ],
  },
] as const;

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="ai-block">
      <div className="ai-block-head">
        <span>{label}</span>
        <button
          type="button"
          data-done={done ? "" : undefined}
          aria-label={done ? "Copied" : `Copy: ${label}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setDone(true);
              setTimeout(() => setDone(false), 1600);
            } catch {}
          }}
        >
          {done ? <Check size={14} weight="bold" /> : <Copy size={14} />}
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

export function AiPanel() {
  const [way, setWay] = useState<(typeof WAYS)[number]["id"]>("agent");
  const w = WAYS.find((x) => x.id === way) ?? WAYS[0];
  return (
    <div className="ai-panel">
      <div className="ai-ways" role="tablist" aria-label="How you work with AI">
        {WAYS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === way} className="ai-way" onClick={() => setWay(x.id)}>
            <span className="ai-way-icon">
              <x.icon size={18} weight={x.id === way ? "fill" : "regular"} />
            </span>
            <span className="ai-way-text">
              <b>{x.title}</b>
              <span>{x.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="ai-detail" role="tabpanel" key={w.id}>
        <p>{w.body}</p>
        {w.blocks.map((b) => (
          <CopyBlock key={b.label} {...b} />
        ))}
      </div>
    </div>
  );
}
