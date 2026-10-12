"use client";

/*
 * The 2D scroll layer: page progress bar, story chapter dots, compact header, below-fold reveals,
 * magnetic buttons and impact counters.
 * One passive scroll listener + rAF writes straight to the DOM; React state changes only when the active chapter
 * or the rail's visibility changes. Story progress (--story, hero tick) is written by StoryStage's own measure(), not here.
 * Server HTML is fully visible: reveals only hide things once html.js-reveal is set on mount.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getReducedMotion, subscribeMotion } from "@/lib/motion";

type Chapter = { id: string; num: string; label: string };

const MAGNET = 6; // px
const COUNT_MS = 900;

export default function ScrollChrome({ chapters }: { chapters: readonly Chapter[] }) {
  // re-runs the effects when the motion choice changes; effects read the live value (the server snapshot is "reduced")
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const barRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [inStory, setInStory] = useState(false);

  const dots = [{ id: "hero", label: "Opening" }, ...chapters.map((c) => ({ id: c.id, label: `Chapter ${c.num}, ${c.label}` }))];

  // progress bar + compact header: one passive listener, one rAF per frame at most
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    let raf = 0;
    let scrolled: boolean | null = null;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      barRef.current?.style.setProperty("transform", `scaleX(${max > 0 ? Math.min(1, y / max).toFixed(4) : 0})`);
      const now = y > 8;
      if (now !== scrolled && header) {
        scrolled = now;
        header.dataset.scrolled = String(now);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // active chapter (the one crossing the middle of the screen) + rail visibility
  useEffect(() => {
    const story = document.getElementById("story");
    const targets = ["hero", ...chapters.map((c) => c.id)].map((id) => document.getElementById(id));
    if (!story) return;
    const mid = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = targets.indexOf(entry.target as HTMLElement);
          if (index >= 0 && index !== activeRef.current) {
            activeRef.current = index;
            setActive(index);
          }
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    targets.forEach((el) => el && mid.observe(el));
    const section = new IntersectionObserver(([entry]) => setInStory(entry.isIntersecting), { rootMargin: "-35% 0px -35% 0px" });
    section.observe(story);
    return () => {
      mid.disconnect();
      section.disconnect();
    };
  }, [chapters]);

  // below-fold reveals: one shared observer for every [data-reveal]
  useEffect(() => {
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.classList.add("js-reveal");
    if (getReducedMotion()) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => !el.classList.contains("is-in") && io.observe(el));
    return () => io.disconnect();
  }, [reduced]);

  // impact counters: count up once in view (full motion only); the server text is the final value
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const parsed = els.map((el) => {
      const text = el.dataset.count ?? el.textContent ?? "";
      const m = text.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);
      return m ? { el, text, pre: m[1], value: parseFloat(m[2]), dec: m[2].split(".")[1]?.length ?? 0, post: m[3] } : null;
    });
    const items = parsed.filter((p) => p !== null);
    if (getReducedMotion()) {
      items.forEach((p) => (p.el.textContent = p.text));
      return;
    }
    const frames = new Set<number>();
    items.forEach((p) => (p.el.textContent = `${p.pre}${(0).toFixed(p.dec)}${p.post}`));
    const run = (p: (typeof items)[number]) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / COUNT_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        p.el.textContent = t < 1 ? `${p.pre}${(p.value * eased).toFixed(p.dec)}${p.post}` : p.text;
        if (t < 1) frames.add(requestAnimationFrame(tick));
      };
      frames.add(requestAnimationFrame(tick));
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const p = items.find((item) => item.el === entry.target);
          if (p) run(p);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.6 },
    );
    items.forEach((p) => io.observe(p.el));
    return () => {
      io.disconnect();
      frames.forEach((id) => cancelAnimationFrame(id));
      items.forEach((p) => (p.el.textContent = p.text));
    };
  }, [reduced]);

  // magnetic buttons: desktop pointers, full motion only; writes --mx / --my, CSS does the transform
  useEffect(() => {
    if (getReducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".btn, .contact__link"));
    const cleanups = els.map((el) => {
      let rect: DOMRect | null = null;
      let raf = 0;
      let x = 0;
      let y = 0;
      const write = () => {
        raf = 0;
        el.style.setProperty("--mx", `${x.toFixed(2)}px`);
        el.style.setProperty("--my", `${y.toFixed(2)}px`);
      };
      const queue = () => {
        if (!raf) raf = requestAnimationFrame(write);
      };
      const onEnter = () => {
        rect = el.getBoundingClientRect();
      };
      const onMove = (e: PointerEvent) => {
        if (!rect) rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        x = Math.max(-1, Math.min(1, dx)) * MAGNET;
        y = Math.max(-1, Math.min(1, dy)) * MAGNET;
        queue();
      };
      const onLeave = () => {
        rect = null;
        x = 0;
        y = 0;
        queue();
      };
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
      };
    });
    return () => cleanups.forEach((fn) => fn());
  }, [reduced]);

  return (
    <>
      <div className="progress" aria-hidden="true">
        <div ref={barRef} className="progress__bar" />
      </div>
      <nav className="rail" aria-label="Story chapters" data-visible={inStory}>
        <ol>
          {dots.map((dot, i) => (
            <li key={dot.id}>
              <a href={`#${dot.id}`} className="rail__dot" aria-label={dot.label} aria-current={i === active ? "step" : undefined}>
                <span aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
