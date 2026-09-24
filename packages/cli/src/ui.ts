/** Terminal output helpers (no dependencies). */
const tty = typeof process !== "undefined" && process.stdout?.isTTY && !process.env.NO_COLOR;
const wrap = (open: number, close: number) => (s: string) => (tty ? `\x1b[${open}m${s}\x1b[${close}m` : s);

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

export function banner(sub: string): string {
  return `${c.bold("LAYR")} ${c.dim(sub)}`;
}

export class CliError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

export interface Args {
  _: string[];
  flags: Record<string, string | boolean>;
}

/** Parses `--flag`, `--key value`, `--key=value`, `-f` and positionals. */
export function parseArgs(argv: string[]): Args {
  const out: Args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "--") {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) out.flags[a.slice(2, eq)] = a.slice(eq + 1);
      else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("-") && VALUE_FLAGS.has(a.slice(2))) {
          out.flags[a.slice(2)] = next;
          i++;
        } else out.flags[a.slice(2)] = true;
      }
    } else if (a.startsWith("-") && a.length > 1) {
      for (const ch of a.slice(1)) out.flags[ch] = true;
    } else out._.push(a);
  }
  return out;
}

/** Flags that take a value. */
const VALUE_FLAGS = new Set(["template", "port", "host", "explain", "base", "out", "tag", "dir", "registry", "frames", "name", "cwd"]);

export function flag(args: Args, ...names: string[]): string | boolean | undefined {
  for (const n of names) if (args.flags[n] !== undefined) return args.flags[n];
  return undefined;
}
