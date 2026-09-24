// Tokenizes LAYR with VS Code's TextMate engine and checks key scopes.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const require = createRequire(import.meta.url);
const wasm = readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm")).buffer;
await oniguruma.loadWASM(wasm);
const registry = new textmate.Registry({
  onigLib: Promise.resolve({ createOnigScanner: (p) => new oniguruma.OnigScanner(p), createOnigString: (s) => new oniguruma.OnigString(s) }),
  loadGrammar: async (scope) => (scope === "source.layr" ? textmate.parseRawGrammar(readFileSync(new URL("../syntaxes/layr.tmLanguage.json", import.meta.url), "utf8"), "layr.json") : null),
});
const grammar = await registry.loadGrammar("source.layr");
const lines = [
  "Container(.id(card) .config(w: 200ds, color: #0d0d0d, !mut padding: all(20))) // note",
  "var int count = 0",
  "Text('Hello $name ${a + 1}')",
];
const expect = [
  ["Container", "entity.name.type.widget.layr"],
  ["config", "entity.name.function.modifier.layr"],
  ["w", "variable.other.property.layr"],
  ["ds", "keyword.other.unit.layr"],
  ["#0d0d0d", "constant.other.color.layr"],
  ["!mut", "storage.modifier.layr"],
  ["all", "support.function.layr"],
  ["// note", "comment.line.double-slash.layr"],
  ["var", "storage.type.layr"],
  ["count", "variable.other.declaration.layr"],
  ["$name", "variable.other.interpolated.layr"],
];
let state = textmate.INITIAL;
const found = new Map();
for (const line of lines) {
  const r = grammar.tokenizeLine(line, state);
  for (const t of r.tokens) found.set(line.slice(t.startIndex, t.endIndex), t.scopes);
  state = r.ruleStack;
}
let failed = 0;
for (const [text, scope] of expect) {
  const scopes = found.get(text) ?? [];
  if (!scopes.includes(scope)) {
    failed++;
    console.log(`✗ ${text}: expected ${scope}, got ${scopes.join(" ")}`);
  }
}
console.log(failed ? `${failed} scope check(s) failed` : `OK: ${expect.length} scope checks`);
process.exit(failed ? 1 : 0);
