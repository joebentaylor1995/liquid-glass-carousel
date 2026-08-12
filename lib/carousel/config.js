// Everything you'd want to edit lives here: the project list + all tunables.
// All of it can also be tweaked live via the lil-gui panel (see gui.js).

// Prefix for the image paths, set when the site is hosted under a sub-path
// (a GitHub Pages project site, say). Guarded so the file still works outside
// a bundler.
const BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH) || "";

// Images shown in the carousel. src is relative to /public. Every panel is
// rendered at CONFIG.ASPECT (16:9) and the texture is centre-cropped to fit,
// so source images can be any shape without stretching.
//   title / subtitle : the caption under the centred panel
//   href             : where the panel links to
//   tags / stat      : the hover overlay content
// NOTE: the stat values below are placeholder copy, not real reported figures.
export const PROJECTS = [
  {
    src: "/Image-1.jpg",
    title: "Putting the city skyline in the palm of your hand",
    subtitle: "One World Trade Center — Pulse",
    href: "/work/one-world-trade-center-pulse",
    tags: [
      "Product Design",
      "App Design",
      "Development",
      "Lighting Control",
      "Motion",
      "Prototyping",
    ],
    stat: { value: "1,776 ft", label: "Of facade under your thumb" },
  },
  {
    src: "/Image-2.jpg",
    title: "A learning platform that puts a face to every course",
    subtitle: "The Estée Lauder Companies — Learning Hub",
    href: "/work/elc-learning-hub",
    tags: [
      "UX Design",
      "Web Design",
      "Development",
      "Design System",
      "Content Strategy",
    ],
    stat: { value: "+58%", label: "Course completion rate" },
  },
  {
    src: "/Image-3.jpg",
    title: "A brand platform for the people making the music",
    subtitle: "Cakewalk",
    href: "/work/cakewalk",
    tags: ["Brand Identity", "Art Direction", "Web Design", "Development"],
    stat: { value: "4.2×", label: "Growth in trial sign-ups" },
  },
  {
    src: "/Image-4.jpg",
    title: "Bringing a lifetime of photos into headset",
    subtitle: "Media Gallery — VR",
    href: "/work/media-gallery-vr",
    tags: [
      "Spatial UI",
      "Product Design",
      "Prototyping",
      "Development",
      "Motion",
    ],
    stat: { value: "12k", label: "Memories, one room" },
  },
  {
    src: "/Image-5.jpg",
    title: "Curated supply, intelligent data, one clear story",
    subtitle: "ONYX",
    href: "/work/onyx",
    tags: ["Brand Identity", "Web Design", "Development", "Motion", "3D"],
    stat: { value: "+47%", label: "CPM uplift for premium inventory" },
  },
].map((p) => ({ ...p, src: BASE + p.src }));

// Layout + drag feel. Only dragging (and the pagination arrows) move the row —
// the wheel is left alone so the page scrolls straight past the carousel. Drag
// moves a target, the scroll lerps after it, and once input has been idle for
// SNAP_IDLE_MS the target is redirected onto the nearest panel center.
export const CONFIG = {
  PANEL_H: 400, // px height — same for every panel
  ASPECT: 16 / 9, // every panel is 16:9; textures are centre-cropped to fit
  GAP: 24, // px gap between panels
  RADIUS: 8, // px corner rounding, on the panels and everything drawn over them
  OFFSET_Y: 60, // px the row sits above center, leaving room for the caption
  EASE: 0.09, // lerp toward target (lower = heavier / more glide)
  DRAG: 1.6, // mouse drag sensitivity
  FRICTION: 0.865, // flick momentum decay after a drag release
  SNAP: true, // settle onto the nearest panel center
  // ms of idle input before snap engages. Distance/velocity gating used to
  // trigger inconsistently (fast flicks vs slow drags behaved completely
  // differently) — idle time means the same thing regardless of speed.
  SNAP_IDLE_MS: 120,
  // lerp for the glide onto the snapped panel — slower than EASE so the
  // final settle reads as a soft landing, not a speed-up.
  SNAP_EASE: 0.05,
  SHRINK_MAX: 60, // drag speed (px/frame) that = full 25% shrink
  SHRINK_ATTACK: 0.25, // how fast panels shrink when speeding up
  SHRINK_DECAY: 0.06, // how fast they grow back when settling
};

// Interaction modes — both toggleable live from the GUI.
//   drag    : click/touch and pull the row sideways. Swaps the cursor to
//             grab / grabbing over the carousel instead of the pointer hand.
//   noClick : kill panel links entirely, for when you only want to browse.
// Invariant: noClick implies drag (there'd be nothing left to do with the
// mouse otherwise), and turning drag off releases noClick.
export const INTERACT = {
  drag: true, // drag-to-scroll enabled
  noClick: false, // true = clicking a panel no longer follows its link
  CLICK_SLOP: 6, // px of movement before a press counts as a drag, not a click
  FLICK_IDLE_MS: 90, // if the pointer sat still this long before release, no flick
  // Touch is held to a different standard than the mouse: a finger expects
  // the row to stick to it, so touch drags run 1:1 and follow much harder
  // than the weighty mouse lerp. Fingers also wobble, so a tap gets more slop.
  TOUCH_DRAG: 1.0, // touch drag sensitivity (mouse uses CONFIG.DRAG)
  TOUCH_EASE: 0.22, // lerp toward the finger while a touch drag is live
  TOUCH_CLICK_SLOP: 12, // px of wobble still counted as a tap, not a drag
};

// The liquid-glass lens (fullscreen post-process). Ported from a hero
// explosion shader, hence some of the exotic knob names.
export const LENS = {
  shape: "circle", // 'circle' (ellipse) | 'square' (rectangle)
  squareRound: 0, // corner rounding for rectangle (0 sharp .. 1 very round)
  rotation: 65, // static rotation in degrees
  spin: 0, // auto-spin speed (deg/sec, 0 = off)
  sizeX: 0.565, // half-width (fraction of viewport height)
  sizeY: 1, // half-height (fraction of viewport height)
  posX: 0.5, // center x in screen-UV (0 left .. 1 right)
  posY: 0.5, // center y in screen-UV (0 bottom .. 1 top)
  zoom: 0, // inward pull strength
  dispersion: 11, // chromatic dispersion
  blur: 0.0, // blur amount (px)
  glow: 4.2, // overall glow multiplier
  whiteGlow: 0.24, // central white nova intensity
  novaSize: 12, // nova size
  blueRing: 6, // blue ring intensity
  ringRadius: 0.49, // ring radius (0..0.5)
  ringWidth: 0.014, // ring width
  shimmer: true, // animated ring shimmer
  shimmerFreq: 12, // shimmer wave count around the ring
  shimmerSpeed: 3.5, // shimmer animation speed
  shimmerDepth: 0.12, // shimmer intensity (0 = none .. 0.5 = strong)
  rimStart: 0.578, // where the rim fluid wave begins
  rimTangential: 0.6, // tangential fluid-wave displacement
  rimInward: 0, // extra inward pull at the rim
  rimFreq1: 2, // fluid wave frequency 1
  rimFreq2: 1, // fluid wave frequency 2
  blueColor: "#009dff", // the soul: blue tint / ring color
  rimLine: 1.4, // bright white border line intensity (0 = off)
  rimLinePos: 0.488, // where the white border sits (0..0.5)
  rimLineWidth: 0.003, // sharpness of the white border
  vignette: 0, // overall screen vignette strength (0 = off)
  vignetteSize: 0.3, // how far in the vignette reaches
  samples: 16, // dispersion samples
  // The glass is held off the middle of the screen so the centred card stays
  // undistorted and only the panels heading off-screen bend. Both are measured
  // outward from half a card's width, in height-fraction units (1.0 = one
  // viewport height), so they hold at any panel size or window size.
  edgeClear: 0.04, // gap between the card's edge and where the bend starts
  edgeFeather: 0.22, // how far it then takes to reach full strength
};

// Hover overlay: a scrim of project detail sits over the panel the mouse is
// on. The engine positions the element every frame; React owns its contents
// and its fade (see CarouselSection).
// The fade is a CSS transition, not a GSAP tween: GSAP runs on rAF, which the
// render loop already owns, so the tween arrived in one or two jumps and read
// as instant. A compositor transition can't be starved that way.
export const HOVER = {
  scrim: 0.75, // black overlay opacity
  fade: 0.4, // seconds for the overlay to fade in / out
  ease: "cubic-bezier(0.22, 1, 0.36, 1)", // CSS easing
  maxTags: 3, // tags shown before the "+N more" chip
};

// Caption + pagination under the centred panel, animated in the React layer.
export const UI_ANIM = {
  duration: 0.45, // seconds for a caption swap
  ease: "power3.out",
  shift: 10, // px the caption lifts as it swaps
  gap: 40, // px between the panel's bottom edge and the caption
};
