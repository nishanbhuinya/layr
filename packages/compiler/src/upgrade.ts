/**
 * Deprecated forms (L1017) as edits: what `layr upgrade` and the editor's "Update all" apply, after
 * listing them and getting a yes. The compiler finds them; this only collects and applies their fixes.
 */
import { DEPRECATIONS, type DeprecationDef } from "@layr-internal/model";
import type { Diagnostic, Span } from "./source.ts";

export interface Upgrade {
  file: string;
  deprecation: DeprecationDef;
  message: string;
  span: Span;
  edits: Array<{ span: Span; text: string }>;
}

/** Every deprecated use in a compile result that has a fix, in file and source order. */
export function upgrades(diagnostics: readonly Diagnostic[]): Upgrade[] {
  const out: Upgrade[] = [];
  const seen = new Set<string>();
  for (const d of diagnostics) {
    if (!d.deprecation || !d.file || !d.fixes?.[0]) continue;
    const def = DEPRECATIONS.find((x) => x.id === d.deprecation);
    const key = `${d.file}@${d.span.start}`;
    if (!def || seen.has(key)) continue;
    seen.add(key);
    out.push({ file: d.file, deprecation: def, message: d.message, span: d.span, edits: d.fixes[0].edits });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.span.start - b.span.start);
}

/** Applies non-overlapping edits to a text (any order given); overlapping ones after the first are skipped. */
export function applyEdits(text: string, edits: ReadonlyArray<{ span: Span; text: string }>): string {
  const sorted = [...edits].sort((a, b) => b.span.start - a.span.start);
  let out = text;
  let limit = Number.POSITIVE_INFINITY;
  for (const e of sorted) {
    if (e.span.end > limit) continue;
    out = out.slice(0, e.span.start) + e.text + out.slice(e.span.end);
    limit = e.span.start;
  }
  return out;
}
