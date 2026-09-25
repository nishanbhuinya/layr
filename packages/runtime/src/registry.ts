/**
 * The Export / Extract / Inject registry. Every addressable feature resolves as:
 *
 *   declared (config) → written (Function / imperative writes) → layers by exeOrder → final
 *
 * Layers are reversible: disposing one (its host unmounted) restores the value below it.
 */
import { Signal } from "./signals.ts";

export interface Layer {
  /** Address of the target object, e.g. `DemoPage::card`. */
  a: string;
  /** Feature key, e.g. `padding`. */
  k: string;
  /** exeOrder; null = after all ordered layers, in registration order. */
  o: number | null;
  f: (prev: unknown) => unknown;
  /** Source location for explanations. */
  src?: string;
  force?: boolean;
}

interface Registered extends Layer {
  seq: number;
}

function deepEq(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => deepEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

class Feature {
  /** Structural equality: owners republish config every render without churning readers. */
  readonly declared = new Signal<unknown>(undefined, deepEq);
  readonly written = new Signal<{ v: unknown } | null>(null);
  readonly layers = new Signal<Registered[]>([]);
  readonly rendered = new Signal<unknown>(undefined, deepEq);
}

const RENDERED = new Set(["size", "pos", "visible"]);
const features = new Map<string, Map<string, Feature>>();
const objectVersion = new Map<string, Signal<number>>();
const immutableTable = new Map<string, Set<string>>();
let seq = 0;

type Warn = (message: string) => void;
let warn: Warn = (m) => console.warn(`[LAYR] ${m}`);

export function setWarn(fn: Warn) {
  warn = fn;
}

function feature(address: string, key: string): Feature {
  let m = features.get(address);
  if (!m) {
    m = new Map();
    features.set(address, m);
  }
  let f = m.get(key);
  if (!f) {
    f = new Feature();
    m.set(key, f);
  }
  return f;
}

/** A per-object version signal: owners read it to re-render when any of their features gain layers or writes. */
export function objectSignal(address: string): Signal<number> {
  let s = objectVersion.get(address);
  if (!s) {
    s = new Signal(0);
    objectVersion.set(address, s);
  }
  return s;
}

function bump(address: string) {
  const s = objectSignal(address);
  s.set(s.peek() + 1);
}

/** Registers `!mut` features. */
export function immutable(table: Record<string, string[]>) {
  for (const [addr, keys] of Object.entries(table)) {
    const set = immutableTable.get(addr) ?? new Set();
    for (const k of keys) set.add(k);
    immutableTable.set(addr, set);
  }
}

/** Drops `!mut` from features (a live editor removing the modifier). Layers refused earlier stay refused. */
export function mutable(table: Record<string, string[]>) {
  for (const [addr, keys] of Object.entries(table)) {
    const set = immutableTable.get(addr);
    if (!set) continue;
    for (const k of keys) set.delete(k);
    if (!set.size) immutableTable.delete(addr);
  }
}

export function isImmutable(address: string, key: string): boolean {
  return immutableTable.get(address)?.has(key) ?? false;
}

/** Declared (config) values, published by the compiler at module load and by owners when they render. */
export function declare(table: Record<string, Record<string, unknown>>) {
  for (const [addr, cfg] of Object.entries(table)) for (const [k, v] of Object.entries(cfg)) feature(addr, k).declared.set(v);
}

export function publish(address: string, key: string, value: unknown) {
  feature(address, key).declared.set(value);
}

export function setRendered(address: string, key: string, value: unknown) {
  feature(address, key).rendered.set(value);
}

function applyLayers(f: Feature, base: unknown, below: number | null): unknown {
  let v = base;
  for (const l of f.layers.get()) {
    if (below !== null && (l.o === null || l.o >= below)) continue;
    v = l.f(v);
  }
  return v;
}

/**
 * Reads a feature. With `order`, returns the value below that exeOrder (base plus layers with
 * `exeOrder < order`), so Extract(.exeOrder(-1)) sees the value before any injection.
 */
export function read(address: string, key: string, order: number | null = null): unknown {
  const f = feature(address, key);
  if (RENDERED.has(key)) return f.rendered.get();
  const w = f.written.get();
  const base = w ? w.v : f.declared.get();
  return applyLayers(f, base, order);
}

/** The value an owner renders: its current declared value plus writes and layers. */
export function resolve(address: string, key: string, declared: unknown): unknown {
  const f = feature(address, key);
  const w = f.written.get();
  return applyLayers(f, w ? w.v : declared, null);
}

/** Keys of an object that currently have writes or layers (read inside the owner's render to track them). */
export function overriddenKeys(address: string): string[] {
  objectSignal(address).get();
  const m = features.get(address);
  if (!m) return [];
  const out: string[] = [];
  for (const [k, f] of m) if (f.written.peek() || f.layers.peek().length) out.push(k);
  return out;
}

/** Imperative write from a Function / TS body (`box.w = 200`). */
export function write(address: string, key: string, value: unknown) {
  if (RENDERED.has(key)) {
    warn(`\`${key}\` of ${address} is measured and read-only; the write was ignored.`);
    return;
  }
  if (isImmutable(address, key)) {
    warn(`\`${key}\` of ${address} is !mut; the write was ignored.`);
    return;
  }
  feature(address, key).written.set({ v: value });
  bump(address);
}

/** Adds an injection layer. Returns a disposer that removes it (the value reverts). */
export function addLayer(layer: Layer): () => void {
  if (RENDERED.has(layer.k)) {
    warn(`\`${layer.k}\` of ${layer.a} is measured and read-only; the Inject${layer.src ? ` at ${layer.src}` : ""} was ignored.`);
    return () => {};
  }
  if (isImmutable(layer.a, layer.k) && !layer.force) {
    warn(`\`${layer.k}\` of ${layer.a} is !mut; the Inject${layer.src ? ` at ${layer.src}` : ""} was ignored.`);
    return () => {};
  }
  const f = feature(layer.a, layer.k);
  const reg: Registered = { ...layer, seq: seq++ };
  const sorted = [...f.layers.peek(), reg].sort((x, y) => (x.o ?? Number.POSITIVE_INFINITY) - (y.o ?? Number.POSITIVE_INFINITY) || x.seq - y.seq);
  f.layers.set(sorted);
  bump(layer.a);
  return () => {
    f.layers.set(f.layers.peek().filter((l) => l !== reg));
    bump(layer.a);
  };
}

/** Forces owners of the given addresses to re-evaluate their layers (their inputs changed). */
export function touch(addresses: Iterable<string>) {
  for (const a of new Set(addresses)) bump(a);
}

export interface CascadeStep {
  kind: "declared" | "written" | "layer";
  value: unknown;
  order?: number | null;
  src?: string;
}

/** The full cascade of a feature, for `layr analyze --explain`-style devtools. */
export function explain(address: string, key: string): CascadeStep[] {
  const f = feature(address, key);
  const steps: CascadeStep[] = [{ kind: "declared", value: f.declared.peek() }];
  let v = f.declared.peek();
  const w = f.written.peek();
  if (w) {
    v = w.v;
    steps.push({ kind: "written", value: v });
  }
  for (const l of f.layers.peek()) {
    v = l.f(v);
    steps.push({ kind: "layer", value: v, order: l.o, src: l.src });
  }
  return steps;
}

/** Test helper: clears all registry state. */
export function resetRegistry() {
  features.clear();
  objectVersion.clear();
  immutableTable.clear();
  seq = 0;
}

/** Forgets every feature, layer and `!mut` entry (a playground starting a fresh run). */
export function reset() {
  features.clear();
  objectVersion.clear();
  immutableTable.clear();
}
