/**
 * `layr chain`: the exeOrder chain of every object. First the objects that Export, Extract, Inject
 * or Duplicate operations change or read; then, for one object, its operations in execution order.
 */
import type { GraphEntry } from "@layr-internal/compiler";
import { findRoot, loadProject } from "../project.ts";
import { type Args, c, CliError, flag } from "../ui.ts";

type Loaded = ReturnType<typeof loadProject>;

/** `Store::card` → `Store.card`; inside a widget `Card>body.text` → `Card.body.text`. */
export function objectName(address: string): string {
  return address.replace("::", ".").replace(/>/g, ".");
}

const WRITES = new Set(["inject", "force"]);
const orderText = (o: number | null) => (o === null ? "·" : o > 0 ? `+${o}` : String(o));
const byOrder = (a: GraphEntry, b: GraphEntry) => (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) || a.file.localeCompare(b.file) || a.span.start - b.span.start;

function where(p: Loaded, e: GraphEntry): string {
  const f = p.files.find((x) => x.path === e.file);
  const before = (f?.text ?? "").slice(0, e.span.start).split("\n");
  return `${e.file}:${before.length}:${(before.at(-1)?.length ?? 0) + 1}`;
}

function kindOf(e: GraphEntry): string {
  if (e.opKind === "Duplicate") return "Duplicate";
  if (e.kind === "force") return "Inject!";
  if (e.kind === "inject") return "Inject";
  if (e.kind === "extract") return e.opKind === "Export" ? "Export" : "Extract";
  return e.kind === "read" ? "read" : e.kind;
}

/** Objects with operations: how many change them, how many read them, and the orders in use. */
export function chainSummary(entries: readonly GraphEntry[]) {
  const objects = new Map<string, { changedBy: Set<string>; readBy: Set<string>; reads: number; orders: Set<number> }>();
  for (const e of entries) {
    if (!e.op && e.kind !== "read") continue;
    const o = objects.get(e.address) ?? { changedBy: new Set(), readBy: new Set(), reads: 0, orders: new Set() };
    // A Duplicate reads its original (an extract entry) and changes its copy (inject entries).
    if (e.op && WRITES.has(e.kind)) o.changedBy.add(e.op);
    else if (e.op) o.readBy.add(e.op);
    else o.reads++;
    if (e.op && e.order !== null) o.orders.add(e.order);
    objects.set(e.address, o);
  }
  // An object only read inline (no operation at all) has no chain to show.
  return [...objects].filter(([, o]) => o.changedBy.size || o.readBy.size).sort((a, b) => objectName(a[0]).localeCompare(objectName(b[0])));
}

export async function chain(args: Args) {
  const p = loadProject(findRoot(process.cwd()));
  const entries = p.result.graph.entries;
  const json = !!flag(args, "json");
  const want = args._[0];

  if (flag(args, "all")) {
    const ops = entries.filter((e) => e.op).sort(byOrder);
    if (json) return console.log(JSON.stringify(ops.map((e) => ({ order: e.order, kind: kindOf(e), object: objectName(e.address), feature: e.key, value: e.text, at: where(p, e) })), null, 2));
    if (!ops.length) return console.log(c.gray("No Export, Extract, Inject or Duplicate in this project."));
    for (const e of ops) console.log(`${orderText(e.order).padStart(6)}  ${kindOf(e).padEnd(9)} ${c.bold(`${objectName(e.address)}.${e.key}`)}  ${e.text ?? ""}  ${c.gray(where(p, e))}`);
    return;
  }

  if (!want) {
    const list = chainSummary(entries);
    if (json) return console.log(JSON.stringify(list.map(([a, o]) => ({ object: objectName(a), changedBy: o.changedBy.size, readBy: o.readBy.size, inlineReads: o.reads, orders: [...o.orders].sort((x, y) => x - y) })), null, 2));
    if (!list.length) return console.log(c.gray("No Export, Extract, Inject or Duplicate in this project."));
    const width = Math.max(...list.map(([a]) => objectName(a).length));
    console.log(`${c.bold("LAYR chain")}  ${c.gray(`${list.length} object(s) that operations change or read`)}\n`);
    for (const [a, o] of list) {
      const parts = [o.changedBy.size ? c.yellow(`changed by ${o.changedBy.size}`) : "", o.readBy.size ? c.green(`read by ${o.readBy.size}`) : "", o.reads ? c.gray(`${o.reads} inline read(s)`) : ""].filter(Boolean);
      const orders = [...o.orders].sort((x, y) => x - y).map(orderText).join(" ");
      console.log(`  ${c.bold(objectName(a).padEnd(width))}  ${parts.join(c.gray(" · "))}${orders ? `   ${c.gray("orders")} ${orders}` : ""}`);
    }
    console.log(c.gray(`\nlayr chain <object> shows one object's chain in order · layr chain --all lists every operation by order`));
    return;
  }

  // One object: by name (`Store.card`), by its last segment (`card`) when unambiguous.
  const addresses = [...new Set(entries.map((e) => e.address))];
  const exact = addresses.filter((a) => objectName(a) === want || a === want);
  const matches = exact.length ? exact : addresses.filter((a) => objectName(a).endsWith(`.${want}`));
  if (!matches.length) throw new CliError(`No operations on \`${want}\`. ${c.bold("layr chain")} lists the objects that have some.`);
  if (matches.length > 1) throw new CliError(`\`${want}\` could be ${matches.map((m) => `\`${objectName(m)}\``).join(", ")}. Name one.`);
  const address = matches[0] as string;
  const mine = entries.filter((e) => e.address === address).sort(byOrder);
  if (json) return console.log(JSON.stringify({ object: objectName(address), chain: mine.map((e) => ({ order: e.order, kind: kindOf(e), feature: e.key, value: e.text, at: where(p, e) })) }, null, 2));
  console.log(`${c.bold(objectName(address))}  ${c.gray("declared config, then each operation by exeOrder")}\n`);
  const ops = mine.filter((e) => e.op);
  if (!ops.length) console.log(c.gray("  no Export, Extract, Inject or Duplicate"));
  // Two operations at one order on this object (L3102): the chain cannot say which comes first.
  const opsAt = new Map<number, Set<string>>();
  for (const e of ops) if (e.order !== null) opsAt.set(e.order, (opsAt.get(e.order) ?? new Set()).add(e.op as string));
  for (const e of ops) {
    const note = e.kind === "extract" ? (e.order === null ? "reads the final value" : `reads what is below ${orderText(e.order)}`) : e.order === null ? "after the ordered ones" : "";
    const clash = e.order !== null && (opsAt.get(e.order)?.size ?? 0) > 1 ? c.red(`  ✗ another operation has ${orderText(e.order)} (L3102)`) : "";
    const paint = WRITES.has(e.kind) ? c.yellow : c.green;
    console.log(`  ${orderText(e.order).padStart(5)}  ${paint(kindOf(e).padEnd(9))} ${e.text ?? e.key}  ${c.gray(where(p, e))}${note ? c.dim(`  ${note}`) : ""}${clash}`);
  }
  const reads = mine.filter((e) => e.kind === "read");
  if (reads.length) {
    console.log(`\n  ${c.gray("read inline (the final value)")}`);
    for (const e of reads) console.log(`         ${c.green("read".padEnd(9))} ${e.key}  ${c.gray(where(p, e))}`);
  }
}
