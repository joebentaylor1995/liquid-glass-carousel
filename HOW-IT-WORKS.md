# How the carousel works

A walkthrough of what's actually going on in `lib/carousel/engine.js`, for anyone who wants to understand, tweak or steal parts of it. No step is magic — it's four small systems layered on top of each other.

## 1. The row

There's no HTML in the carousel itself. Every image is a three.js plane mesh, rendered with an **orthographic camera set up so 1 world unit = 1 pixel**. That one decision makes all the math readable: positions and sizes are just pixels, no projection to reason about.

Every panel is the same box: `PANEL_H` tall and `ASPECT` (16:9) wide. Source images are any shape they like — the texture is centre-cropped into that box with `offset`/`repeat` rather than stretched, so nothing distorts:

```
width = ASPECT * PANEL_H          slot = width + GAP
```

Lay the slots end to end and you get one "loop" — the full set of 12 images, `totalWidth` pixels wide. The `offsets` array remembers where each slot starts inside that loop.

### Making it infinite

The row wraps. The trick is in `layout()`, which runs every frame:

- take a panel's position inside the loop, subtract the current scroll,
- wrap it with a modulo so it always lands inside one loop-width window around the screen,
- hide any mesh that ends up off-screen.

Since a wide monitor might need to show more than one copy of the same image at once, there isn't one mesh per image — there's a **pool of 4 copies of the full set** (`REPEATS`). Each copy covers a different "rung" of the wrap, so panels never run dry at the edges.

Nothing is ever created or destroyed while dragging. The same 48 meshes get repositioned forever.

The whole row sits `OFFSET_Y` pixels above the middle of the section, which is where the caption's space comes from.

## 2. The motion

Two numbers drive everything:

```
target — where the row wants to be (moved by a drag, or by the arrows)
scroll — where the row actually is
```

Each frame: `scroll += (target - scroll) * ease`. That single lerp is the entire feel of the carousel — input yanks `target` around, and `scroll` trails it like it's being dragged through honey. Lower `EASE` = heavier.

**The wheel is deliberately not wired up.** The carousel sits in a full-height section with more page above and below it, and scrolling is the page's gesture — the row only ever moves when you drag it or press an arrow.

### Dragging

Grabbing the row: each pointer move subtracts its delta from `target`. Three details make it feel right rather than merely work:

- **Pointer capture.** On press the canvas captures the pointer, so a drag that leaves the window keeps updating instead of dying mid-pull.
- **Click vs. drag.** A press accumulates travelled distance. Past `CLICK_SLOP` px the release sets `suppressClick`, which eats the browser's click event so a drag never accidentally follows a panel's link. Touch gets a bigger slop, because fingers wobble.
- **Flick momentum.** Release speed (smoothed over several frames so one jittery frame can't define it) becomes `velocity`, which is added to `target` each frame and decays by `FRICTION`. But only if the pointer was *still moving* at release — let go after holding still and the row stops dead rather than launching.

Touch is deliberately held to a different standard than the mouse: fingers expect the row to stick to them, so touch drags run 1:1 and use a much harder follow ease (`TOUCH_EASE`). The canvas keeps `touch-action: pan-y`, so a horizontal swipe is ours and a vertical one still scrolls the page.

### The settle snap

Free dragging alone stops wherever your hand left it, which usually means an image half-off-center. The fix: once input has been idle for `SNAP_IDLE_MS`, redirect `target` once to the panel nearest the *current* scroll position, and switch to the slower `SNAP_EASE` so the landing reads as a soft touchdown.

Because only the *target* moves — the scroll keeps lerping — the landing is part of the same motion. There's no second animation, no click into place. It just looks like the glide happened to end on an image.

Idle time is the trigger for a reason. An earlier version gated the snap on remaining distance and velocity, and it fired at wildly different moments for a fast flick versus a slow drag. How long you've stopped for means the same thing regardless of how fast you were going.

### The arrows

`step(±1)` is the same system with a third input: it aims `target` at the next panel center along. It steps from wherever the row is *heading* (not where it currently is) so repeated clicks queue up instead of all resolving to the same neighbour, and it keeps the normal `EASE` — a deliberate journey to the next card shouldn't crawl at snap speed.

### Speed shrink

The drag speed is smoothed into a 0..1 "energy" value (fast attack, slow decay). Panels scale down by up to 25% × energy, so the row visually compresses when you rip through it and relaxes when it settles.

## 3. The lens

The glass look is a two-pass render:

1. The whole row is rendered into an **offscreen framebuffer** (at device resolution — on retina screens the buffer is 2× the CSS size, otherwise everything would be soft).
2. A fullscreen quad draws that framebuffer to screen through a fragment shader.

Inside the shader, a disc (or rounded rect) region gets the treatment: UVs are pulled inward (refraction), the rim gets chromatic dispersion by sampling the texture ~16 times along a small offset and weighting the samples red-to-blue, plus a white nova at the center, a shimmering blue ring, a bright border line, and a sine-based fluid wave that wobbles the rim. Outside the disc, the framebuffer passes through untouched.

Every knob is a uniform, mirrored 1:1 from `LENS` in `config.js`.

## 4. Hover, when the world moves

One non-obvious problem: the pointer isn't the only thing that moves — the row slides underneath it. Testing hover only on pointer events left the state stale whenever the carousel moved beneath a still cursor: a panel arriving under the pointer got no grab cursor until you jiggled the mouse. So `refreshHover()` re-runs the hit test every frame, right after `layout()` rebuilds the panel rectangles.

That same hit test does three things at once:

- sets the cursor (all writes funnel through one deduped `updateCursor()`, since it runs every frame),
- tells React which project is under the mouse, via `onHoverChange`,
- parks the **hover overlay** — a plain DOM element the host hands us — exactly over the hovered panel by writing its `transform` and size.

Splitting it that way keeps the per-frame work in the engine and the contents/fade in React, so a GSAP tween on the overlay can never fight the transform writes. The overlay is `pointer-events: none`, so sitting on top of the panel doesn't break the hover test underneath it.

Hover is mouse-only (a finger has no hover state to describe) and is dropped while a drag is live — the grabbing hand carries that interaction on its own.

## The React layer

`Components/CarouselSection.jsx` doesn't know any of the above exists. It mounts the engine, and the engine reports back through three callbacks: which image is centered (for the caption), which one is hovered (for the overlay contents), and which one was clicked (`onSelect`, which the component turns into a route push). The arrows call `engine.step(±1)`. That's the entire API surface — which is also why the engine can be lifted into a non-React project unchanged.

## Things that look odd but are load-bearing

- **The lens shader ends with `#include <colorspace_fragment>`.** The framebuffer holds linear light and the lens pass writes straight to an sRGB canvas, so the encode has to happen by hand — three only adds it to its own materials, never to a hand-written `ShaderMaterial`. Drop that line and every pixel lands about a 2.2 gamma too dark, which reads as "the images look murky" rather than as an obvious bug.
- **`renderer.setClearColor(0xffffff)`** matches the page background so the framebuffer gaps between panels blend into the page.
- **The canvas is `position: absolute; inset: 0`** so panel rects and the DOM overlay share one coordinate space.
- **Pointer coordinates get the canvas origin subtracted** (`getBoundingClientRect`, cached and invalidated on scroll/resize). The carousel no longer starts at the top of the page, so client coords aren't canvas coords.
- **Textures get mipmaps + anisotropy** on load, and are centre-cropped to 16:9 via `offset`/`repeat`.
- **The framebuffer is sized × devicePixelRatio** and resized the same way. Sizing it in CSS pixels renders at half resolution on retina and everything looks blurry.
