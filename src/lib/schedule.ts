/*
 * Main-thread scheduling helpers for the 3D start-up.
 * The 3D chunk is only requested after the page has finished loading AND the browser reports an idle slot,
 * so it never competes with hydration or the first paint. Heavy init steps yield between each other so no
 * single task blocks input for long.
 */

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** Runs `cb` after window 'load' and then an idle callback (timeout ~2.5 s). Returns a cancel function. */
export function afterLoadIdle(cb: () => void, timeout = 2500): () => void {
  const w = window as IdleWindow;
  let cancelled = false;
  let idleId: number | null = null;
  let timerId: number | null = null;

  const schedule = () => {
    if (cancelled) return;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => !cancelled && cb(), { timeout });
    else timerId = window.setTimeout(() => !cancelled && cb(), 1200);
  };

  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idleId !== null) w.cancelIdleCallback?.(idleId);
    if (timerId !== null) window.clearTimeout(timerId);
  };
}

/** Gives the main thread back to the browser (input, paint) before the next heavy step. */
export function nextTask(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}
