"use client";

// React wrapper around the carousel. All the WebGL/drag logic lives in
// lib/carousel/engine.js — this component only owns the DOM layer: the
// caption under the centred panel, the pagination arrows and the hover
// overlay (the engine parks that element over the hovered panel; the fade
// and the contents are ours).
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { PROJECTS, CONFIG, HOVER, UI_ANIM } from "@/lib/carousel/config";
import { createCarousel } from "@/lib/carousel/engine";
import { createCarouselGui } from "@/lib/carousel/gui";

// The carousel is a desktop experience (drag-driven, heavy shader work).
// At this viewport width or below we show a plain black screen instead.
const MIN_VIEWPORT_WIDTH = 1025; // px

// the caption sits under the panel: half a panel below the row's center,
// which itself sits CONFIG.OFFSET_Y above the middle of the section
const CAPTION_TOP = `calc(50% - ${CONFIG.OFFSET_Y}px + ${
  CONFIG.PANEL_H / 2 + UI_ANIM.gap
}px)`;

const Chevron = ({ dir }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={dir < 0 ? { transform: "scaleX(-1)" } : undefined}
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

const CarouselSection = () => {
  const mountRef = useRef(null); // engine mounts its canvas here
  const overlayRef = useRef(null); // hover overlay, positioned by the engine
  const captionRef = useRef(null); // caption block — GSAP-animated on swap
  const engineRef = useRef(null); // createCarousel() handle
  const routerRef = useRef(null); // kept in a ref so the engine callback is stable
  const captionSeenRef = useRef(false); // first caption paints without a fade

  const [active, setActive] = useState(0); // index of the centered image
  const [hovered, setHovered] = useState(-1); // index under the mouse (-1 none)
  // "pending" until we know the viewport (SSR-safe), then "ok" | "small"
  const [screen, setScreen] = useState("pending");

  const router = useRouter();
  // the engine keeps one onSelect callback for its whole life, so the router
  // is handed over through a ref rather than baked into it
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // ---- viewport gate ----
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MIN_VIEWPORT_WIDTH - 1}px)`);
    const update = () => setScreen(mq.matches ? "small" : "ok");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ---- engine lifecycle ----
  useEffect(() => {
    if (screen !== "ok") return; // never boot WebGL on small screens
    const engine = createCarousel(mountRef.current, {
      overlayElement: overlayRef.current,
      onActiveChange: setActive,
      onHoverChange: setHovered,
      onSelect: (i) => routerRef.current?.push(PROJECTS[i].href),
    });
    engineRef.current = engine;
    const gui = createCarouselGui(engine); // dev panel (hidden by default)
    return () => {
      gui.destroy();
      engine.destroy();
      engineRef.current = null;
    };
  }, [screen]);

  // ---- caption swap ----
  // GSAP-driven so it shares the canvas motion's easing vocabulary. The very
  // first caption appears without a fade — there's no intro animation to
  // wait for any more.
  useEffect(() => {
    const node = captionRef.current;
    if (!node) return;
    if (!captionSeenRef.current) {
      captionSeenRef.current = true;
      gsap.set(node, { autoAlpha: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      node,
      { autoAlpha: 0, y: UI_ANIM.shift },
      {
        autoAlpha: 1,
        y: 0,
        duration: UI_ANIM.duration,
        ease: UI_ANIM.ease,
        overwrite: true,
      },
    );
  }, [active]);

  // ---- hover overlay fade ----
  // The engine only moves the element; showing it is ours, so the fade can't
  // fight the per-frame transform writes.
  useEffect(() => {
    const node = overlayRef.current;
    if (!node) return;
    gsap.to(node, {
      autoAlpha: hovered >= 0 ? 1 : 0,
      duration: HOVER.fade,
      ease: HOVER.ease,
      overwrite: true,
    });
  }, [hovered]);

  const step = useCallback((dir) => engineRef.current?.step(dir), []);

  // small screens: a plain black holding screen instead of the carousel.
  // "pending" (first paint, viewport not measured yet) stays black too so
  // mobile users never see a flash of the desktop experience booting.
  if (screen !== "ok") {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-black">
        {screen === "small" && (
          <p className="px-8 text-center text-sm text-white/70">
            This experience is designed for larger screens.
            <br />
            Please visit on a display wider than 1024px.
          </p>
        )}
      </div>
    );
  }

  const project = PROJECTS[active];
  const hoveredProject = hovered >= 0 ? PROJECTS[hovered] : null;
  const shownTags = hoveredProject
    ? hoveredProject.tags.slice(0, HOVER.maxTags)
    : [];
  const restTags = hoveredProject
    ? hoveredProject.tags.length - shownTags.length
    : 0;

  return (
    <section
      ref={mountRef}
      aria-label="Featured work"
      className="relative h-[100dvh] w-full overflow-hidden bg-white"
    >
      {/* hover overlay — the engine sets its transform/size every frame */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute left-0 top-0 z-20 overflow-hidden"
        style={{ opacity: 0, visibility: "hidden", willChange: "transform" }}
      >
        {hoveredProject && (
          <div
            className="flex h-full w-full flex-col justify-between p-7"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${HOVER.scrim})`,
              backdropFilter: `blur(${HOVER.blur}px)`,
              WebkitBackdropFilter: `blur(${HOVER.blur}px)`,
            }}
          >
            <div className="flex flex-wrap">
              {shownTags.map((tag) => (
                <span
                  key={tag}
                  className="-ml-px border border-white/25 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white first:ml-0"
                >
                  {tag}
                </span>
              ))}
              {restTags > 0 && (
                <span className="-ml-px border border-white/25 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/70">
                  +{restTags} more
                </span>
              )}
            </div>

            <div>
              <p className="text-[44px] font-light italic leading-none text-white">
                {hoveredProject.stat.value}
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/70">
                {hoveredProject.stat.label}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* caption for the centred panel */}
      <div
        ref={captionRef}
        className="pointer-events-none absolute left-1/2 z-10 w-full max-w-[620px] -translate-x-1/2 px-6 text-center"
        style={{ top: CAPTION_TOP }}
      >
        <p className="text-[26px] leading-[1.28] text-black">{project.title}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-black/45">
          {project.subtitle}
        </p>
      </div>

      {/* pagination — one panel at a time */}
      <div
        className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-3"
        style={{ top: `calc(${CAPTION_TOP} + 130px)` }}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous project"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/[0.06] text-black transition-colors hover:bg-black/[0.12]"
        >
          <Chevron dir={-1} />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next project"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/[0.06] text-black transition-colors hover:bg-black/[0.12]"
        >
          <Chevron dir={1} />
        </button>
      </div>

      {/* the panels are links, but they live on a canvas — this keeps them
          reachable by keyboard and by crawlers */}
      <nav aria-label="All featured work" className="sr-only">
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.href}>
              <Link href={p.href}>
                {p.title} — {p.subtitle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
};

export default CarouselSection;
