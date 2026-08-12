# WebGL Glass Carousel

An infinite, drag-driven portfolio carousel rendered with **three.js** and finished with a liquid-glass lens shader — chromatic dispersion, a shimmering ring and a fluid rim, all as a single fullscreen post-process.

Built with Next.js (App Router), but the carousel core is plain JavaScript with no framework dependency.

## Features

- **Infinite row** — panels wrap seamlessly in both directions; every panel is a 16:9 box and images are centre-cropped into it (no stretch).
- **Drag, not scroll** — grab and pull the row, with flick momentum and touch tuned separately from the mouse. The wheel is left alone, so the page scrolls straight past the carousel and the row stays where you left it. When input stops, it lands softly on the nearest panel center in one continuous motion.
- **Pagination arrows** — step exactly one panel back or forward; repeated clicks queue up.
- **Liquid-glass lens** — the row renders into a framebuffer and is drawn through a refraction shader: inward pull, chromatic dispersion, white nova core, blue shimmer ring, fluid rim wave.
- **Three effects, one toggle** — `LENS.mode` picks `glass` (the lens), `bulge` (flat middle, swollen ends) or `sphere` (you stand at the middle of the curve and the row wraps around you).
- **Caption under the active panel** — the centred project's title and client, swapped with a soft fade.
- **Hover overlay** — hovering a panel fades in a 75% black scrim over it with the project's services and a headline stat.
- **Panels are links** — a real click follows the project's `href`; a drag's trailing click never does.
- **Speed shrink** — panels compress slightly at high drag speed for a sense of weight.
- **Live tuning** — every constant is editable at runtime through a hidden [lil-gui](https://lil-gui.georgealways.com/) panel.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/                          Next.js app (a 100dvh section either side of
                              the carousel, plus a placeholder /work page)
Components/
  CarouselSection.jsx         React wrapper — DOM layer only (caption,
                              arrows, hover overlay)
lib/carousel/
  config.js                   ← the project list + every tunable. Start here.
  engine.js                   the core: scene, infinite row, drag model,
                              lens shader, hit-testing
  gui.js                      optional lil-gui dev panel
public/                       carousel images
```

### Add your own images

1. Drop images into `public/`.
2. Edit the `PROJECTS` list in `lib/carousel/config.js` — each entry is `{ src, title, subtitle, href, tags, stat }`. Images are centre-cropped to 16:9, so any source shape works.

### Tune the feel

Everything lives in `lib/carousel/config.js`, documented inline. The most impactful knobs:

| Setting | What it does |
| --- | --- |
| `CONFIG.EASE` | Glide weight — lower = heavier, more drift |
| `CONFIG.SNAP_IDLE_MS` | How long input must be idle before it settles on a panel |
| `CONFIG.PANEL_H` | Panel height (width is always `PANEL_H × 16/9`) |
| `CONFIG.OFFSET_Y` | How far above center the row sits — the caption's headroom |
| `INTERACT.drag` / `noClick` | Drag-to-scroll on/off; browsing mode with the links disabled |
| `LENS.*` | Everything about the glass lens |
| `HOVER.*` / `UI_ANIM.*` | Hover-overlay scrim + fade, caption swap timing |

For live tweaking, **press `g`** to open the lil-gui dev panel (hidden by default). Copy the numbers you land on back into `config.js`.

### Use the engine without React

`lib/carousel/engine.js` has no React imports. Mount it anywhere:

```js
import { createCarousel } from "./lib/carousel/engine";

const carousel = createCarousel(document.querySelector("#mount"), {
  overlayElement: document.querySelector("#hover-overlay"),
  onActiveChange: (i) => console.log("centered image", i),
  onHoverChange: (i) => {},
  onSelect: (i) => {},
});

// carousel.step(1), carousel.step(-1), carousel.destroy()
```

## How it works (short version)

Want the full story — the infinite wrap math, the two-pass lens render, how the hover hit test and the DOM overlay cooperate? Read **[HOW-IT-WORKS.md](./HOW-IT-WORKS.md)**. (AI assistants get their own briefing in [AGENTS.md](./AGENTS.md).)

1. **Row** — an orthographic camera where 1 unit = 1 px. A pool of `REPEATS × N` plane meshes is repositioned every frame (`layout()`), wrapping positions around the total row width for the infinite effect.
2. **Motion** — a drag (or an arrow) moves a `target`; `scroll` lerps toward it each frame. Once input goes quiet, `target` is redirected to the nearest panel center so the landing is part of the same glide. The wheel is never bound, so the page scrolls past untouched.
3. **Lens** — pass 1 renders the row into a device-resolution framebuffer; pass 2 draws that texture through the lens shader on a fullscreen quad.
4. **Hover** — the per-frame hit test drives the cursor, tells React which project is under the mouse, and parks the DOM overlay over that panel.

## Stack

[three.js](https://threejs.org) · [GSAP](https://gsap.com) · [Next.js](https://nextjs.org) · [Tailwind CSS](https://tailwindcss.com) · [lil-gui](https://lil-gui.georgealways.com/)

## License

MIT — see [LICENSE](./LICENSE). The license covers the code only: the demo images and font are **not** included (they belong to their original creators — see [CREDITS.md](./CREDITS.md)).
