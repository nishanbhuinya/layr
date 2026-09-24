/** The LAYR language server (LSP over stdio), backed by LayrService. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Diagnostic as LayrDiagnostic } from "@layr-internal/compiler";
import { DIAGNOSTIC_BY_CODE } from "@layr-internal/model";
import { loadConfig, readProjectFiles } from "@layr-internal/node";
import {
  CodeActionKind,
  type CompletionItem,
  CompletionItemKind,
  createConnection,
  type Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  type InitializeParams,
  ProposedFeatures,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
  TextEdit,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { type Completion, LayrService } from "./service.ts";

const KIND: Record<Completion["kind"], CompletionItemKind> = {
  widget: CompletionItemKind.Class,
  construct: CompletionItemKind.Keyword,
  modifier: CompletionItemKind.Method,
  key: CompletionItemKind.Property,
  value: CompletionItemKind.EnumMember,
  frame: CompletionItemKind.Constant,
  keyword: CompletionItemKind.Keyword,
  id: CompletionItemKind.Reference,
  color: CompletionItemKind.Color,
};

function findRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "layr.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

export function start() {
  const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);
  const documents = new TextDocuments(TextDocument);
  let root = process.cwd();
  const service = new LayrService();

  const toPath = (uri: string) => relative(root, fileURLToPath(uri)).replace(/\\/g, "/");
  const toUri = (path: string) => pathToFileURL(resolve(root, path)).href;

  const loadWorkspace = () => {
    try {
      const cfg = loadConfig(root);
      service.setConfig(cfg.project);
      for (const f of readProjectFiles(root, cfg)) if (!documents.get(toUri(f.path))) service.setFile(f.path, f.text);
    } catch (e) {
      connection.console.error(`LAYR: could not load the project: ${(e as Error).message}`);
    }
  };

  const toLsp = (path: string, d: LayrDiagnostic): Diagnostic => {
    const s = service.position(path, d.span.start);
    const e = service.position(path, d.span.end);
    return {
      range: { start: { line: s.line - 1, character: s.column - 1 }, end: { line: e.line - 1, character: e.column - 1 } },
      severity: d.severity === "error" ? DiagnosticSeverity.Error : d.severity === "warning" ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information,
      code: d.code,
      codeDescription: { href: `https://layr.dynshift.com/errors/${d.code}` },
      source: "layr",
      message: d.message,
      data: { fixes: d.fixes ?? [] },
      relatedInformation: d.related?.map((r) => {
        const rp = r.file ?? path;
        const rs = service.position(rp, r.span.start);
        return { location: { uri: toUri(rp), range: { start: { line: rs.line - 1, character: rs.column - 1 }, end: { line: rs.line - 1, character: rs.column } } }, message: r.message };
      }),
    };
  };

  const publishAll = () => {
    const r = service.compile();
    for (const path of r.modules.keys()) connection.sendDiagnostics({ uri: toUri(path), diagnostics: service.diagnostics(path).map((d) => toLsp(path, d)) });
  };

  let pending: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(publishAll, 150);
  };

  connection.onInitialize((params: InitializeParams) => {
    const folder = params.workspaceFolders?.[0]?.uri ?? params.rootUri;
    if (folder) root = findRoot(fileURLToPath(folder));
    loadWorkspace();
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { triggerCharacters: [".", "(", ":", " "] },
        hoverProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentFormattingProvider: true,
        documentSymbolProvider: true,
        codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
      },
      serverInfo: { name: "layr", version: "3" },
    };
  });

  connection.onInitialized(() => publishAll());

  documents.onDidChangeContent((e) => {
    const path = toPath(e.document.uri);
    if (path.endsWith("layr.yaml") || path.endsWith("app.layr")) loadWorkspace();
    service.setFile(path, e.document.getText());
    schedule();
  });

  connection.onDidChangeWatchedFiles(() => {
    loadWorkspace();
    schedule();
  });

  const offsetOf = (uri: string, pos: { line: number; character: number }) => service.offset(toPath(uri), pos.line + 1, pos.character + 1);
  const rangeOf = (path: string, span: { start: number; end: number }) => {
    const s = service.position(path, span.start);
    const e = service.position(path, span.end);
    return { start: { line: s.line - 1, character: s.column - 1 }, end: { line: e.line - 1, character: e.column - 1 } };
  };

  connection.onCompletion((p): CompletionItem[] =>
    service.complete(toPath(p.textDocument.uri), offsetOf(p.textDocument.uri, p.position)).map((c) => ({
      label: c.label,
      kind: KIND[c.kind],
      detail: c.detail,
      documentation: c.doc ? { kind: "markdown", value: c.doc } : undefined,
      insertText: c.insert,
    })),
  );

  connection.onHover((p) => {
    const path = toPath(p.textDocument.uri);
    const h = service.hover(path, offsetOf(p.textDocument.uri, p.position));
    return h ? { contents: { kind: "markdown", value: h.markdown }, range: rangeOf(path, h.span) } : null;
  });

  connection.onDefinition((p) => {
    const l = service.definition(toPath(p.textDocument.uri), offsetOf(p.textDocument.uri, p.position));
    return l ? { uri: toUri(l.path), range: rangeOf(l.path, l.span) } : null;
  });

  connection.onReferences((p) =>
    service.references(toPath(p.textDocument.uri), offsetOf(p.textDocument.uri, p.position)).map((l) => ({ uri: toUri(l.path), range: rangeOf(l.path, l.span) })),
  );

  connection.onDocumentFormatting((p) => {
    const path = toPath(p.textDocument.uri);
    const doc = documents.get(p.textDocument.uri);
    const out = service.format(path);
    if (!doc || out === null || out === doc.getText()) return [];
    return [TextEdit.replace({ start: { line: 0, character: 0 }, end: doc.positionAt(doc.getText().length) }, out)];
  });

  connection.onDocumentSymbol((p) => {
    const path = toPath(p.textDocument.uri);
    const kind = { page: SymbolKind.Class, widget: SymbolKind.Class, function: SymbolKind.Function, state: SymbolKind.Variable } as const;
    const conv = (s: ReturnType<LayrService["symbols"]>[number]): DocumentSymbol =>
      DocumentSymbol.create(s.name, s.kind, kind[s.kind], rangeOf(path, s.span), rangeOf(path, s.span), s.children?.map(conv));
    return service.symbols(path).map(conv);
  });

  connection.onCodeAction((p) => {
    const actions = [];
    for (const d of p.context.diagnostics) {
      const fixes = ((d.data as { fixes?: Array<{ title: string; edits: Array<{ span: { start: number; end: number }; text: string }> }> } | undefined)?.fixes ?? []);
      const path = toPath(p.textDocument.uri);
      for (const f of fixes)
        actions.push({ title: f.title, kind: CodeActionKind.QuickFix, diagnostics: [d], edit: { changes: { [p.textDocument.uri]: f.edits.map((e) => TextEdit.replace(rangeOf(path, e.span), e.text)) } } });
      const def = DIAGNOSTIC_BY_CODE.get(String(d.code));
      if (def && !fixes.length) actions.push({ title: `Explain ${def.code}: ${def.title}`, kind: CodeActionKind.Empty, command: { title: "Open", command: "vscode.open", arguments: [`https://layr.dynshift.com/errors/${def.code}`] } });
    }
    return actions;
  });

  documents.listen(connection);
  connection.listen();
}

/** Reads a file relative to the workspace (used by tests). */
export function readWorkspaceFile(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}
