/*
 * Motion preference.
 * Every first visit starts in full motion (many Windows users switch OS animations off for speed, not comfort);
 * the "Reduce motion" toggle turns it down. The choice is remembered in localStorage and
 * ?motion=full | ?motion=reduced in the URL overrides everything (handy for testing).
 */

const KEY = "skybloom-motion";
type Listener = () => void;

let reduced: boolean | null = null;
const listeners = new Set<Listener>();

function readChoice(): "full" | "reduced" | null {
  const fromUrl = new URLSearchParams(window.location.search).get("motion");
  if (fromUrl === "full" || fromUrl === "reduced") return fromUrl;
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === "full" || saved === "reduced" ? saved : null;
  } catch {
    return null; // storage blocked (private mode, sandboxed embeds)
  }
}

function applyClass(value: boolean) {
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", value);
  root.classList.toggle("full-motion", !value);
}

/** Client only. Computed once, then kept in sync by setReducedMotion(). */
export function getReducedMotion(): boolean {
  if (reduced === null) {
    const choice = readChoice();
    reduced = choice === "full" ? false : choice === "reduced";
    applyClass(reduced);
  }
  return reduced;
}

export function setReducedMotion(value: boolean) {
  reduced = value;
  applyClass(value);
  try {
    window.localStorage.setItem(KEY, value ? "reduced" : "full");
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
  // a ?motion= in the URL would beat the saved choice on the next visit
  const url = new URL(window.location.href);
  if (url.searchParams.has("motion")) {
    url.searchParams.delete("motion");
    window.history.replaceState(null, "", url);
  }
  listeners.forEach((listener) => listener());
}

export function subscribeMotion(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
