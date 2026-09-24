export interface Span {
  start: number;
  end: number;
}

export type Severity = "error" | "warning" | "info";

export interface Fix {
  title: string;
  edits: Array<{ span: Span; text: string }>;
}

export interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  span: Span;
  file?: string;
  fixes?: Fix[];
  related?: Array<{ message: string; span: Span; file?: string }>;
}

export interface Position {
  line: number; // 1-based
  column: number; // 1-based
}

/** Maps offsets to line/column. */
export class SourceFile {
  readonly lineStarts: number[];
  readonly path: string;
  readonly text: string;

  constructor(path: string, text: string) {
    this.path = path;
    this.text = text;
    this.lineStarts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) this.lineStarts.push(i + 1);
    }
  }

  position(offset: number): Position {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((this.lineStarts[mid] as number) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - (this.lineStarts[lo] as number) + 1 };
  }

  offset(pos: Position): number {
    const start = this.lineStarts[pos.line - 1] ?? this.text.length;
    return Math.min(start + pos.column - 1, this.text.length);
  }

  slice(span: Span): string {
    return this.text.slice(span.start, span.end);
  }
}

export function span(start: number, end: number): Span {
  return { start, end };
}

export function cover(a: Span, b: Span): Span {
  return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) };
}
