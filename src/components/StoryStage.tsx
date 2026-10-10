"use client";

/*
 * The sticky stage behind the hero and the four story chapters.
 * Decides 3D vs poster (probe + quality tier happen before the Canvas exists), writes scroll progress into the
 * shared story store and asks the scene for a frame.
 * Loading order: the server HTML paints the hero over the painted sky; only after window 'load' and an idle slot
 * do we probe the GPU (a tiny throwaway context, no three.js). Software renderers (SwiftShader, llvmpipe, ...) get
 * the SVG poster and the 3D chunk is never downloaded; ?quality= forces the 3D on. Otherwise the chunk is
 * imported, warmed up behind the loader and faded in with opacity only.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getReducedMotion, subscribeMotion } from "@/lib/motion";
import { probeGpu, wants3d, type GpuProbe } from "@/lib/quality";
import { afterLoadIdle } from "@/lib/schedule";
import { requestFrame, story } from "@/lib/story";
import Poster from "./Poster";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

export default function StoryStage() {
  const [gpu, setGpu] = useState<GpuProbe | null>(null);
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const onReady = useCallback(() => setReady(true), []);
  const onLost = useCallback(() => setLost(true), []);

  // probe + start loading the 3D only once the page itself is loaded and the browser is idle
  useEffect(() => afterLoadIdle(() => setGpu(probeGpu())), []);

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

  const use3d = gpu !== null && wants3d(gpu) && !lost;
  const showPoster = gpu !== null && !use3d;

  return (
    <div ref={stageRef} className="stage sticky top-0 h-svh w-full overflow-hidden" aria-hidden="true">
      <div className="stage__sky absolute inset-0" />
      {use3d ? (
        <div className={`stage__canvas absolute inset-0 ${ready ? "is-ready" : ""}`}>
          <Scene tier={gpu.tier} reducedMotion={reduced} onReady={onReady} onLost={onLost} />
        </div>
      ) : null}
      {showPoster ? (
        <div className="stage__poster absolute inset-0">
          <Poster />
        </div>
      ) : null}
      {use3d && !ready ? (
        <div className="stage__loader">
          <span className="stage__seed" />
          Breaking ground
        </div>
      ) : null}
    </div>
  );
}
