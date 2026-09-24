/**
 * Fine-grained reactivity. Signals hold values; computeds derive them; observers (React components,
 * effects) re-run when what they read changes. Reading inside an observer tracks automatically.
 */

export interface Source<T> {
  get(): T;
  peek(): T;
  subscribe(fn: () => void): () => void;
}

type Listener = () => void;

let current: Tracker | null = null;
let batchDepth = 0;
const pending = new Set<Listener>();

export interface Tracker {
  track(s: Source<unknown>): void;
}

export function withTracker<T>(t: Tracker | null, fn: () => T): T {
  const prev = current;
  current = t;
  try {
    return fn();
  } finally {
    current = prev;
  }
}

/** Sets the current tracker and returns the previous one (for render phases that cannot be wrapped). */
export function swapTracker(t: Tracker | null): Tracker | null {
  const prev = current;
  current = t;
  return prev;
}

export function untracked<T>(fn: () => T): T {
  return withTracker(null, fn);
}

export function currentTracker(): Tracker | null {
  return current;
}

function notify(listeners: Set<Listener>) {
  for (const l of [...listeners]) {
    if (batchDepth > 0) pending.add(l);
    else l();
  }
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pending.size) {
      const list = [...pending];
      pending.clear();
      for (const l of list) l();
    }
  }
}

export class Signal<T> implements Source<T> {
  private v: T;
  private readonly listeners = new Set<Listener>();
  readonly equals: (a: T, b: T) => boolean;

  constructor(value: T, equals: (a: T, b: T) => boolean = Object.is) {
    this.v = value;
    this.equals = equals;
  }

  get(): T {
    current?.track(this as Source<unknown>);
    return this.v;
  }

  peek(): T {
    return this.v;
  }

  set(value: T): void {
    if (this.equals(this.v, value)) return;
    this.v = value;
    notify(this.listeners);
  }

  update(fn: (v: T) => T): void {
    this.set(fn(this.v));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  toString(): string {
    return String(this.v);
  }
}

export class Computed<T> implements Source<T>, Tracker {
  private v: T | undefined;
  private dirty = true;
  private readonly fn: () => T;
  private readonly deps = new Map<Source<unknown>, () => void>();
  private readonly listeners = new Set<Listener>();
  private computing = false;

  constructor(fn: () => T) {
    this.fn = fn;
  }

  track(s: Source<unknown>): void {
    if (!this.deps.has(s)) this.deps.set(s, s.subscribe(() => this.invalidate()));
  }

  private invalidate() {
    if (this.dirty) return;
    this.dirty = true;
    notify(this.listeners);
  }

  private recompute() {
    if (this.computing) throw new Error("LAYR: a bind depends on itself (cycle).");
    this.computing = true;
    for (const unsub of this.deps.values()) unsub();
    this.deps.clear();
    try {
      this.v = withTracker(this, this.fn);
    } finally {
      this.computing = false;
    }
    this.dirty = false;
  }

  get(): T {
    current?.track(this as Source<unknown>);
    if (this.dirty) this.recompute();
    return this.v as T;
  }

  peek(): T {
    if (this.dirty) this.recompute();
    return this.v as T;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/** Collects the sources read during a run and notifies once when any of them changes. */
export class Observer implements Tracker {
  private deps = new Map<Source<unknown>, () => void>();
  private next = new Set<Source<unknown>>();
  private onChange: Listener | null = null;
  version = 0;

  track(s: Source<unknown>): void {
    this.next.add(s);
  }

  begin(): void {
    this.next = new Set();
  }

  /** Reconciles subscriptions with what the last run read. */
  end(): void {
    for (const [s, unsub] of this.deps) {
      if (!this.next.has(s)) {
        unsub();
        this.deps.delete(s);
      }
    }
    for (const s of this.next) {
      if (!this.deps.has(s))
        this.deps.set(
          s,
          s.subscribe(() => {
            this.version++;
            this.onChange?.();
          }),
        );
    }
  }

  listen(fn: Listener | null): void {
    this.onChange = fn;
  }

  dispose(): void {
    for (const unsub of this.deps.values()) unsub();
    this.deps.clear();
    this.onChange = null;
  }
}

export function signal<T>(v: T): Signal<T> {
  return new Signal(v);
}

export function computed<T>(fn: () => T): Computed<T> {
  return new Computed(fn);
}

/** Runs `fn` now and again whenever what it read changes. Returns a disposer. */
export function effect(fn: () => void | (() => void)): () => void {
  const obs = new Observer();
  let cleanup: void | (() => void);
  let disposed = false;
  const run = () => {
    if (disposed) return;
    if (typeof cleanup === "function") cleanup();
    obs.begin();
    cleanup = withTracker(obs, fn);
    obs.end();
  };
  obs.listen(run);
  run();
  return () => {
    disposed = true;
    if (typeof cleanup === "function") cleanup();
    obs.dispose();
  };
}

export function isSource(v: unknown): v is Source<unknown> {
  return typeof v === "object" && v !== null && typeof (v as Source<unknown>).get === "function" && typeof (v as Source<unknown>).subscribe === "function";
}
