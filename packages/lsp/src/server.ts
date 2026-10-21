/** The LAYR language server (LSP over stdio), backed by LayrService. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyEdits, type Diagnostic as LayrDiagnostic, upgrades } from "@layr-internal/compiler";
import { DIAGNOSTIC_BY_CODE } from "@layr-internal/model";
import { loadConfig, readProjectFiles } from "@layr-internal/node";
import {
  type CodeAction,
  CodeActionKind,
  type CompletionItem,
  CompletionItemKind,
  createConnection,
  type Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
  DocumentSymbol,
  type InitializeParams,
  InsertTextFormat,
  ProposedFeatures,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
  TextEdit,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { refactors } from "./refactor.ts";
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

/** The command the editor runs to apply every deprecated form's fix (after the developer agrees). */
export const UPGRADE_COMMAND = "layr.upgradeAll";

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

  /** Reads layr.yaml and app.layr; with `files`, also every project file not open in the editor. */
  const loadWorkspace = (files = true) => {
    try {
      const cfg = loadConfig(root);
      service.setConfig(cfg.project);
      if (files) for (const f of readProjectFiles(root, cfg)) if (!documents.get(toUri(f.path))) service.setFile(f.path, f.text);
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
      ...(d.deprecation ? { tags: [DiagnosticTag.Deprecated] } : {}),
      data: { fixes: d.fixes ?? [] },
      relatedInformation: d.related?.map((r) => {
        const rp = r.file ?? path;
        const rs = service.position(rp, r.span.start);
        return { location: { uri: toUri(rp), range: { start: { line: rs.line - 1, character: rs.column - 1 }, end: { line: rs.line - 1, character: rs.column } } }, message: r.message };
      }),
    };
  };

  // Diagnostics are sent for the files whose list changed (one compile serves the whole project).
  const sent = new Map<string, string>();
  let deprecations = -1;
  const publishAll = () => {
    if (configDirty) {
      configDirty = false;
      loadWorkspace(false);
    }
    const r = service.compile();
    for (const path of r.modules.keys()) {
      const list = service.diagnostics(path).map((d) => toLsp(path, d));
      const key = JSON.stringify(list);
      if (sent.get(path) === key) continue;
      sent.set(path, key);
      connection.sendDiagnostics({ uri: toUri(path), diagnostics: list });
    }
    // The editor offers to update deprecated forms (inform → consent → do); it decides when to ask.
    const ups = upgrades(r.diagnostics);
    if (ups.length !== deprecations) {
      deprecations = ups.length;
      const titles = [...new Set(ups.map((u) => u.deprecation.title))];
      connection.sendNotification("layr/deprecations", { count: ups.length, files: new Set(ups.map((u) => u.file)).size, titles, since: ups[0]?.deprecation.since ?? null });
    }
  };

  let pending: ReturnType<typeof setTimeout> | null = null;
  let configDirty = false;
  const schedule = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(publishAll, 150);
  };

  connection.onInitialize((params: InitializeParams) => {
    const folder = params.workspaceFolders?.[0]?.uri ?? params.rootUri;
    if (folder) root = findRoot(fileURLToPath(folder));
    // The editor gets its answer at once; the project loads and compiles right after (onInitialized).
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { triggerCharacters: [".", "(", ":"] },
        hoverProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentFormattingProvider: true,
        documentSymbolProvider: true,
        codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorRewrite, CodeActionKind.RefactorExtract] },
        executeCommandProvider: { commands: [UPGRADE_COMMAND] },
      },
      serverInfo: { name: "layr", version: "3" },
    };
  });

  connection.onInitialized(() => {
    loadWorkspace();
    publishAll();
  });

  documents.onDidChangeContent((e) => {
    const path = toPath(e.document.uri);
    // The app's design frames and theme are re-read with the next compile, not on every keystroke.
    if (path.endsWith("layr.yaml") || path.endsWith("app.layr")) configDirty = true;
    service.setFile(path, e.document.getText());
    schedule();
  });

  // A closed file is whatever is on disk again (unsaved edits are gone).
  documents.onDidClose((e) => {
    const path = toPath(e.document.uri);
    const abs = resolve(root, path);
    if (existsSync(abs)) service.setFile(path, readFileSync(abs, "utf8"));
    else service.removeFile(path);
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
      insertTextFormat: c.snippet ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
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

  const replaceAll = (uri: string, text: string): TextEdit[] => {
    const doc = documents.get(uri);
    const old = doc?.getText() ?? service.text(toPath(uri)) ?? "";
    if (old === text) return [];
    const end = doc ? doc.positionAt(old.length) : (() => { const p = service.position(toPath(uri), old.length); return { line: p.line - 1, character: p.column - 1 }; })();
    return [TextEdit.replace({ start: { line: 0, character: 0 }, end }, text)];
  };

  connection.onDocumentFormatting((p) => {
    const out = service.format(toPath(p.textDocument.uri));
    return out === null ? [] : replaceAll(p.textDocument.uri, out);
  });

  connection.onDocumentSymbol((p) => {
    const path = toPath(p.textDocument.uri);
    const kind = { page: SymbolKind.Class, widget: SymbolKind.Class, function: SymbolKind.Function, state: SymbolKind.Variable } as const;
    const conv = (s: ReturnType<LayrService["symbols"]>[number]): DocumentSymbol =>
      DocumentSymbol.create(s.name, s.kind, kind[s.kind], rangeOf(path, s.span), rangeOf(path, s.span), s.children?.map(conv));
    return service.symbols(path).map(conv);
  });

  connection.onCodeAction((p) => {
    const actions: CodeAction[] = [];
    const path = toPath(p.textDocument.uri);
    for (const d of p.context.diagnostics) {
      const fixes = ((d.data as { fixes?: Array<{ title: string; edits: Array<{ span: { start: number; end: number }; text: string }> }> } | undefined)?.fixes ?? []);
      for (const f of fixes)
        actions.push({ title: f.title, kind: CodeActionKind.QuickFix, diagnostics: [d], isPreferred: true, edit: { changes: { [p.textDocument.uri]: f.edits.map((e) => TextEdit.replace(rangeOf(path, e.span), e.text)) } } });
      const def = DIAGNOSTIC_BY_CODE.get(String(d.code));
      if (def && !fixes.length) actions.push({ title: `Explain ${def.code}: ${def.title}`, kind: CodeActionKind.Empty, command: { title: "Open", command: "vscode.open", arguments: [`https://layr.dynshift.com/errors/${def.code}`] } });
      if (d.tags?.includes(DiagnosticTag.Deprecated)) actions.push({ title: "Update every deprecated form in the project", kind: CodeActionKind.QuickFix, diagnostics: [d], command: { title: "Update all", command: UPGRADE_COMMAND } });
    }
    // Wrap, remove, move and extract the object under the cursor.
    const only = p.context.only;
    if (!only || only.some((k) => k.startsWith("refactor"))) {
      const text = service.text(path);
      if (text !== undefined) {
        for (const r of refactors(text, offsetOf(p.textDocument.uri, p.range.start), offsetOf(p.textDocument.uri, p.range.end)))
          actions.push({ title: r.title, kind: r.kind === "refactor.extract" ? CodeActionKind.RefactorExtract : CodeActionKind.RefactorRewrite, edit: { changes: { [p.textDocument.uri]: replaceAll(p.textDocument.uri, r.text) } } });
      }
    }
    return actions;
  });

  // Update all: the fix of every deprecated form, in every file, as one edit the editor applies (and can undo).
  connection.onExecuteCommand(async (p) => {
    if (p.command !== UPGRADE_COMMAND) return;
    const ups = upgrades(service.compile().diagnostics);
    const changes: Record<string, TextEdit[]> = {};
    for (const file of new Set(ups.map((u) => u.file))) {
      const text = service.text(file) ?? "";
      changes[toUri(file)] = replaceAll(toUri(file), applyEdits(text, ups.filter((u) => u.file === file).flatMap((u) => u.edits)));
    }
    if (Object.keys(changes).length) await connection.workspace.applyEdit({ label: "LAYR: update deprecated forms", edit: { changes } });
  });

  documents.listen(connection);
  connection.listen();
}

/** Reads a file relative to the workspace (used by tests). */
export function readWorkspaceFile(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}
