"use client";

import { useSyncExternalStore } from "react";
import { getReducedMotion, setReducedMotion, subscribeMotion } from "@/lib/motion";

export default function MotionToggle({ className = "" }: { className?: string }) {
  // null on the server and during hydration, the real preference right after
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, () => null);
  return (
    <button
      type="button"
      className={`motion-toggle ${className}`}
      style={reduced === null ? { visibility: "hidden" } : undefined}
      onClick={() => reduced !== null && setReducedMotion(!reduced)}
    >
      <span className="motion-toggle__dot" aria-hidden="true" data-on={reduced === false} />
      <span className="motion-toggle__long">{reduced ? "Turn on full motion" : "Reduce motion"}</span>
      <span className="motion-toggle__short">{reduced ? "Full motion" : "Less motion"}</span>
    </button>
  );
}
