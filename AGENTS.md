# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
# Project notes for AI assistants

WebGL portfolio carousel: three.js core with a thin React/Next.js wrapper (GSAP is used by the React layer only). Human docs: `README.md` (overview) and `HOW-IT-WORKS.md` (architecture walkthrough) — read the latter before changing engine behavior.

## File map

| File | Owns |
| --- | --- |
| `lib/carousel/config.js` | `PROJECTS` list + all tunables (`CONFIG`, `INTERACT`, `LENS`, `HOVER`, `UI_ANIM`). Data only, no logic. |
| `lib/carousel/engine.js` | Everything on the canvas: renderer, infinite row, drag model, lens shader (inline GLSL), hit-testing, render loop. Framework-free — no React imports, ever. |
| `lib/carousel/gui.js` | lil-gui dev panel (hidden by default). Mutates the config objects live. |
| `Components/CarouselSection.jsx` | React overlay only: caption under the centred panel, pagination arrows, hover-overlay contents + fade, sr-only link list, viewport gate (<1025px shows a black screen and never boots WebGL). |
| `app/page.js` | A 100dvh section, `<CarouselSection />`, another 100dvh section. |
| `app/work/[slug]/page.js` | Placeholder destination for the panel links. |

Routing common requests: add/change images → `config.js` `PROJECTS` (each entry carries its caption, link, hover tags and stat). Panel size / gap / drag feel / snap → `config.js` `CONFIG`. Drag + click-vs-drag thresholds → `config.js` `INTERACT`. Lens look → `config.js` `LENS` (`mode` picks the `glass` lens or the `sphere` wrap; uniforms mirror it 1:1). Hover overlay look → `HOVER` + the markup in `CarouselSection.jsx`. Caption/arrow layout → `UI_ANIM` + `CarouselSection.jsx`. Motion/render behavior → `engine.js`.

## Architecture invariants — do not break these

- **The engine talks to React only via callbacks** (`onActiveChange`, `onHoverChange`, `onSelect`, `onModeChange`) and the returned handle (`step`, `refreshLayout`, `setInteraction`, `destroy`). Don't import React into the engine or reach into engine internals from the component.
- **The wheel is not an input.** The carousel lives between two full-height sections and the page must scroll straight past it. Nothing in the engine may listen to `wheel`, and `touch-action` stays `pan-y` so vertical swipes belong to the page.
- **One easing system.** Motion is a single lerp (`scroll += (target - scroll) * ease`), where `ease` picks between `EASE` / `SNAP_EASE` / `TOUCH_EASE` per frame. Drag, momentum, the arrows and the settle-snap all move `target` only — nothing may move `scroll` directly or add a second tween on it. (History: layered easing/snap systems here caused jumpy scrolling and were rebuilt twice.)
- **The settle-snap triggers on idle time** (`SNAP_IDLE_MS` since the last input), not on remaining distance or velocity. Distance/velocity gating fired at different moments for fast flicks vs slow drags and felt inconsistent — don't reintroduce it.
- **Cursor state has one owner.** All cursor writes go through `updateCursor()` (deduped, runs every frame via `refreshHover`). Never set `el.style.cursor` directly.
- **A drag must not follow a link.** `onPointerUp` sets `suppressClick` past `CLICK_SLOP` (`TOUCH_CLICK_SLOP` for touch) and `onClick` consumes it. Keep that handshake intact when touching either handler.
- **The engine positions the hover overlay, React fades it.** The engine writes `transform`/`width`/`height` every frame; the component owns opacity and contents. Don't tween the transform, and keep the overlay `pointer-events: none` or it eats the hover test underneath it.
- **Pointer coords need the canvas origin subtracted** (`bounds()`), because the canvas no longer starts at the top of the page. The cache is invalidated on scroll and resize — keep both.
- **The lens shader must end with `#include <colorspace_fragment>`.** The FBO holds linear light and the lens pass writes straight to an sRGB canvas; three only adds the encode to its own materials, not to a hand-written `ShaderMaterial`. Without it everything renders ~2.2 gamma too dark.
- **The FBO is sized in device pixels** (`W * dpr`), including in `onResize`. Sizing it in CSS pixels makes everything blurry on retina.
- **Textures need mipmaps + anisotropy**, and are centre-cropped to `CONFIG.ASPECT` via `offset`/`repeat` — every panel is 16:9 and nothing may be stretched to fit.
- **1 world unit = 1 px** (orthographic camera). All layout math assumes this.
- **Panel indices can be any integer** — `centerForIndex`/`nearestIndex` use an unbounded index (`source = idx mod N`, loop = `floor(idx / N)`) so the row can target the nearest copy of a panel across the infinite wrap. Don't clamp them to `0..N-1`.

## Conventions

- Comment style: short, lowercase, practical (`// match page bg so FBO gaps blend`). Section markers are `// ---- name ----`. No JSDoc blocks, no banner rulers — the owner wants the code to read hand-written.
- Keep `config.js` values in sync with `gui.js` slider ranges when adding tunables, and mirror any new `LENS` key as a shader uniform.
- JS only (no TypeScript). Path alias `@/*` → repo root.

## Verify changes

```bash
npm run build     # compiles (Turbopack) — catches wiring mistakes
npx eslint Components lib app
npm run dev       # feel-check drag/snap/hover by hand; these are not unit-testable
```
