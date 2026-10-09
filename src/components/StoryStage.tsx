"use client";

/*
 * The sticky stage behind the hero and the four story chapters.
 * Decides 3D vs poster (probe + quality tier happen before the Canvas exists), writes scroll progress into the
 * shared story store and asks the scene for a frame. The 3D chunk is loaded lazily, after the browser goes idle.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getReducedMotion, subscribeMotion } from "@/lib/motion";
import { probeGpu } from "@/lib/quality";
import { requestFrame, story } from "@/lib/story";
import Poster from "./Poster";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

const noopSubscribe = () => () => {};

export default function StoryStage() {
  const gpu = useSyncExternalStore(noopSubscribe, probeGpu, () => null);
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const onReady = useCallback(() => setReady(true), []);
  const onLost = useCallback(() => setLost(true), []);

  // start loading the 3D once the page itself is interactive
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMount(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setMount(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  // scroll progress through the story section + visibility + pointer
  useEffect(() => {
    const stage = stageRef.current;
    const section = stage?.closest<HTMLElement>("[data-story]");
    if (!stage || !section) return;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      story.target = Math.min(1, Math.max(0, -rect.top / range));
      requestFrame();
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    const io = new IntersectionObserver(([entry]) => {
      story.visible = entry.isIntersecting;
      if (entry.isIntersecting) requestFrame();
    });
    io.observe(stage);

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      story.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      story.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      if (story.visible) requestFrame();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    const onVisibility = () => !document.hidden && requestFrame();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  const use3d = gpu?.webgl === true && !lost;
  const showPoster = gpu !== null && !use3d;

  return (
    <div ref={stageRef} className="stage sticky top-0 h-svh w-full overflow-hidden" aria-hidden="true">
      <div className="stage__sky absolute inset-0" />
      {use3d && mount ? (
        <div className={`stage__canvas absolute inset-0 ${ready ? "is-ready" : ""}`}>
          <Scene tier={gpu.tier} reducedMotion={reduced} onReady={onReady} onLost={onLost} />
        </div>
      ) : null}
      {showPoster ? <Poster /> : null}
      {use3d && !ready ? (
        <div className="stage__loader">
          <span className="stage__seed" />
          Breaking ground
        </div>
      ) : null}
    </div>
  );
}
