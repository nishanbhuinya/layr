/**
 * Actions (`.fnc`, `.on`, Functions) run with a context that ties them to the lifetime of the
 * object that started them: `wait` and loops stop when it unmounts.
 */

export class Cancelled extends Error {
  constructor() {
    super("LAYR action cancelled");
    this.name = "Cancelled";
  }
}

export class ActionContext {
  private readonly lifetime: { alive: boolean };

  constructor(lifetime: { alive: boolean } = { alive: true }) {
    this.lifetime = lifetime;
  }

  alive(): boolean {
    return this.lifetime.alive;
  }

  wait(ms: number): Promise<void> {
    if (!this.lifetime.alive) return Promise.reject(new Cancelled());
    return new Promise((resolve, reject) => {
      setTimeout(() => (this.lifetime.alive ? resolve() : reject(new Cancelled())), Math.max(0, ms));
    });
  }

  /** Yields to the next animation frame (used by loops so they never block). */
  frame(): Promise<void> {
    if (!this.lifetime.alive) return Promise.reject(new Cancelled());
    return new Promise((resolve, reject) => {
      const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 16);
      raf(() => (this.lifetime.alive ? resolve() : reject(new Cancelled())));
    });
  }
}

const DETACHED = { alive: true };

/** A context not tied to any object (calls made while rendering). */
export function detached(): ActionContext {
  return new ActionContext(DETACHED);
}

export type Action = (ctx: ActionContext, ...args: unknown[]) => unknown;

/** Runs an action, reporting errors instead of throwing into the UI. */
export function run(action: Action, args: unknown[] = [], lifetime?: { alive: boolean }): Promise<unknown> {
  const ctx = new ActionContext(lifetime ?? DETACHED);
  return Promise.resolve()
    .then(() => action(ctx, ...args))
    .catch((e: unknown) => {
      if (e instanceof Cancelled) return undefined;
      console.error("[LAYR] action failed:", e);
      return undefined;
    });
}
