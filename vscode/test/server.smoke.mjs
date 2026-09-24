// Speaks LSP over stdio to the bundled server: initialize → didOpen → diagnostics, completion, hover, formatting.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "layr-lsp-"));
mkdirSync(join(root, "src", "pages"), { recursive: true });
writeFileSync(join(root, "layr.yaml"), "name: smoke\n");
const text = "Page(\n  .name(Home)\n  Scaffold(.body(Container(.config(widht: 200, color: red))))\n)\n";
const file = join(root, "src", "pages", "home.layr");
writeFileSync(file, text);
const uri = pathToFileURL(file).href;

const server = spawn(process.execPath, [new URL("../dist/server.js", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "--stdio"], { stdio: ["pipe", "pipe", "inherit"] });
let buf = Buffer.alloc(0);
const waiters = new Map();
const notes = [];
server.stdout.on("data", (d) => {
  buf = Buffer.concat([buf, d]);
  for (;;) {
    const head = buf.indexOf("\r\n\r\n");
    if (head < 0) return;
    const len = Number(/Content-Length: (\d+)/i.exec(buf.slice(0, head).toString())[1]);
    if (buf.length < head + 4 + len) return;
    const msg = JSON.parse(buf.slice(head + 4, head + 4 + len).toString());
    buf = buf.slice(head + 4 + len);
    if (msg.id !== undefined && waiters.has(msg.id)) {
      waiters.get(msg.id)(msg.result);
      waiters.delete(msg.id);
    } else if (msg.method) notes.push(msg);
  }
});
let id = 0;
const send = (m) => {
  const s = JSON.stringify({ jsonrpc: "2.0", ...m });
  server.stdin.write(`Content-Length: ${Buffer.byteLength(s)}\r\n\r\n${s}`);
};
const request = (method, params) =>
  new Promise((resolve) => {
    const i = ++id;
    waiters.set(i, resolve);
    send({ id: i, method, params });
  });
const fail = (m) => {
  console.error(`FAIL: ${m}`);
  server.kill();
  process.exit(1);
};

const init = await request("initialize", { processId: process.pid, rootUri: pathToFileURL(root).href, capabilities: {}, workspaceFolders: [{ uri: pathToFileURL(root).href, name: "smoke" }] });
if (!init.capabilities.completionProvider) fail("no completion provider");
send({ method: "initialized", params: {} });
send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "layr", version: 1, text } } });
const started = Date.now();
while (!notes.some((n) => n.method === "textDocument/publishDiagnostics" && n.params.uri === uri && n.params.diagnostics.length)) {
  if (Date.now() - started > 10000) fail("no diagnostics published");
  await new Promise((r) => setTimeout(r, 50));
}
const diags = notes.filter((n) => n.method === "textDocument/publishDiagnostics" && n.params.uri === uri).at(-1).params.diagnostics;
if (!diags.some((d) => d.code === "L1002" && d.message.includes("widht") && d.message.includes("Did you mean `w`"))) fail(`unexpected diagnostics ${JSON.stringify(diags)}`);
const line = 2;
const character = text.split("\n")[line].indexOf("widht");
const completion = await request("textDocument/completion", { textDocument: { uri }, position: { line, character } });
if (!completion.some((c) => c.label === "padding")) fail("completion lacks config keys");
const hover = await request("textDocument/hover", { textDocument: { uri }, position: { line, character: text.split("\n")[line].indexOf("Container") + 1 } });
if (!hover?.contents?.value?.includes("**Container**")) fail("hover lacks widget docs");
const edits = await request("textDocument/formatting", { textDocument: { uri }, options: { tabSize: 2, insertSpaces: true } });
if (!Array.isArray(edits)) fail("formatting failed");
console.log(`OK: ${diags.length} diagnostic(s), ${completion.length} completions, hover and formatting work`);
server.kill();
process.exit(0);
