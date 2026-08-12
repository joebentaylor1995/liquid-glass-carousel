// Everything you'd want to edit lives here: the project list + all tunables.
// All of it can also be tweaked live via the lil-gui panel (see gui.js).

// Images shown in the carousel. src is relative to /public. Every panel is
// rendered at CONFIG.ASPECT (16:9) and the texture is centre-cropped to fit,
// so source images can be any shape without stretching.
//   title / subtitle : the caption under the centred panel
//   href             : where the panel links to
//   tags / stat      : the hover overlay content
export const PROJECTS = [
  {
    src: "/img1.png",
    title: "A launch microsite built to make a new phone feel inevitable",
    subtitle: "Nothing — Phone (2a)",
    href: "/work/nothing-phone-2a",
    tags: [
      "Brand Identity",
      "Web Design",
      "Development",
      "Motion",
      "Art Direction",
      "Copywriting",
      "3D",
      "Launch Strategy",
    ],
    stat: { value: "+47%", label: "Uplift in pre-order sign-ups" },
  },
  {
    src: "/img2.png",
    title: "Rethinking the product page as a guided, cinematic experience",
    subtitle: "Apple — 330 P4 Concept",
    href: "/work/apple-330-p4",
    tags: ["Web Design", "Development", "Motion", "Prototyping", "3D"],
    stat: { value: "2.4×", label: "Longer average time on page" },
  },
  {
    src: "/img12.jpg",
    title: "A hypercar configurator that behaves like the car it sells",
    subtitle: "Ferrari — 499P",
    href: "/work/ferrari-499p",
    tags: [
      "Web Design",
      "Development",
      "Real-time 3D",
      "Motion",
      "Performance",
      "CMS",
    ],
    stat: { value: "+61%", label: "Configurations completed" },
  },
  {
    src: "/img4.png",
    title: "Translating a fragrance house into something you can feel online",
    subtitle: "Aesop — Sensorial Story",
    href: "/work/aesop-sensorial",
    tags: ["Art Direction", "Web Design", "Development", "Copywriting"],
    stat: { value: "+38%", label: "Return visits within a month" },
  },
  {
    src: "/img5.png",
    title: "A reveal journey that holds attention from teaser to order book",
    subtitle: "Polestar — Polestar 5",
    href: "/work/polestar-5",
    tags: [
      "Campaign",
      "Web Design",
      "Development",
      "Motion",
      "Analytics",
      "CRM",
    ],
    stat: { value: "+29%", label: "Qualified leads per session" },
  },
  {
    src: "/img6.png",
    title: "An acoustic lab where the product explains itself",
    subtitle: "Bang & Olufsen — Beosound",
    href: "/work/bang-olufsen-beosound",
    tags: ["Web Design", "Development", "Sound Design", "Motion", "3D"],
    stat: { value: "+52%", label: "Add-to-basket from product story" },
  },
  {
    src: "/img7.png",
    title: "A digital drop that treats the lookbook like a runway slot",
    subtitle: "Off-White — FW Lookbook",
    href: "/work/off-white-lookbook",
    tags: ["Art Direction", "Web Design", "Development", "Commerce"],
    stat: { value: "9 min", label: "Median session on drop day" },
  },
  {
    src: "/img8.png",
    title: "Fifty years of aluminium, told as one continuous archive",
    subtitle: "Rimowa — Heritage Archive",
    href: "/work/rimowa-heritage",
    tags: [
      "Editorial Design",
      "Web Design",
      "Development",
      "CMS",
      "Accessibility",
    ],
    stat: { value: "+44%", label: "Pages viewed per visit" },
  },
  {
    src: "/img9.png",
    title: "Craft made legible: a maison editorial for the people behind it",
    subtitle: "Loewe — Craft Maison",
    href: "/work/loewe-craft-maison",
    tags: ["Editorial Design", "Web Design", "Development", "Photography"],
    stat: { value: "+33%", label: "Newsletter conversion" },
  },
  {
    src: "/img10.png",
    title: "Small objects, long stories, and an atelier worth scrolling through",
    subtitle: "Hermès — Petit h",
    href: "/work/hermes-petit-h",
    tags: ["Web Design", "Development", "Motion", "Localisation", "CMS"],
    stat: { value: "17", label: "Markets launched simultaneously" },
  },
  {
    src: "/img11.png",
    title: "A couture capsule built entirely around motion",
    subtitle: "Balenciaga — Couture Capsule",
    href: "/work/balenciaga-capsule",
    tags: ["Art Direction", "Motion", "Web Design", "Development"],
    stat: { value: "+71%", label: "Share rate versus previous drop" },
  },
  {
    src: "/img3.png",
    title: "An instrument showcase you can actually play in the browser",
    subtitle: "Teenage Engineering — OP-1 Field",
    href: "/work/teenage-engineering-op1",
    tags: [
      "Web Design",
      "Development",
      "Sound Design",
      "Interaction",
      "3D",
      "Prototyping",
    ],
    stat: { value: "4.6×", label: "Interactions per visitor" },
  },
];

// Layout + drag feel. Only dragging (and the pagination arrows) move the row —
// the wheel is left alone so the page scrolls straight past the carousel. Drag
// moves a target, the scroll lerps after it, and once input has been idle for
// SNAP_IDLE_MS the target is redirected onto the nearest panel center.
export const CONFIG = {
  PANEL_H: 400, // px height — same for every panel
  ASPECT: 16 / 9, // every panel is 16:9; textures are centre-cropped to fit
  GAP: 24, // px gap between panels
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
};

// Hover overlay: a scrim of project detail sits over the panel the mouse is
// on. The engine positions the element every frame; React owns its contents
// and its fade (see CarouselSection).
export const HOVER = {
  scrim: 0.75, // black overlay opacity
  blur: 6, // px of backdrop blur behind the scrim
  fade: 0.35, // seconds for the overlay to fade in / out
  ease: "power3.out",
  maxTags: 3, // tags shown before the "+N more" chip
};

// Caption + pagination under the centred panel, animated in the React layer.
export const UI_ANIM = {
  duration: 0.45, // seconds for a caption swap
  ease: "power3.out",
  shift: 10, // px the caption lifts as it swaps
  gap: 40, // px between the panel's bottom edge and the caption
};
