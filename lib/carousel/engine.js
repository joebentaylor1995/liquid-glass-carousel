// The carousel itself — three.js, no React. An infinite flat row of 16:9
// image panels rendered into an offscreen buffer, then drawn to screen
// through the liquid-glass lens shader. Drag (or the pagination arrows) move
// the row; the wheel is deliberately untouched so the page scrolls past.
// The React component just mounts this and listens to the callbacks.
//
//   const carousel = createCarousel(mountEl, {
//     overlayElement,          // optional hover overlay, positioned by us
//     onActiveChange(i) {},    // centered image changed
//     onHoverChange(i) {},     // panel under the mouse changed (-1 = none)
//     onSelect(i) {},          // a real click on a panel -> follow its link
//   });
//   carousel.step(1); carousel.destroy();

import * as THREE from "three";
import { PROJECTS, CONFIG, INTERACT, LENS } from "./config";

export function createCarousel(mount, callbacks = {}) {
  const {
    overlayElement = null,
    onActiveChange = () => {},
    onHoverChange = () => {},
    onSelect = () => {},
    onModeChange = () => {},
  } = callbacks;

  let W = mount.clientWidth;
  let H = mount.clientHeight;

  // ---- renderer / scene / camera (orthographic, 1 unit = 1 px) ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0xffffff, 1); // match page bg so FBO gaps blend
  mount.appendChild(renderer.domElement);
  // pinned to the mount's origin so panel rects and the DOM overlay share
  // one coordinate space
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -W / 2,
    W / 2,
    H / 2,
    -H / 2,
    -100,
    100,
  );
  camera.position.z = 10;

  // ---- load the source images ----
  // Every panel is CONFIG.ASPECT (16:9), so the texture gets centre-cropped
  // via offset/repeat rather than stretched to fit the plane.
  const loader = new THREE.TextureLoader();
  const sources = PROJECTS.map((img) => {
    const s = { tex: null };
    loader.load(img.src, (tex) => {
      // mipmaps + anisotropy keep panels crisp while they render small
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.colorSpace = THREE.SRGBColorSpace;
      cropToAspect(tex);
      s.tex = tex;
    });
    return s;
  });

  // centre-crop (cover) the texture into the panel's fixed aspect
  function cropToAspect(tex) {
    if (!tex.image) return;
    const ia = tex.image.width / tex.image.height;
    if (ia > CONFIG.ASPECT) {
      const r = CONFIG.ASPECT / ia;
      tex.repeat.set(r, 1);
      tex.offset.set((1 - r) / 2, 0);
    } else {
      const r = ia / CONFIG.ASPECT;
      tex.repeat.set(1, r);
      tex.offset.set(0, (1 - r) / 2);
    }
  }

  // every panel is the same 16:9 box, so every slot is the same width
  function slotWidth() {
    return CONFIG.ASPECT * CONFIG.PANEL_H + CONFIG.GAP;
  }

  // cumulative x of each source's slot, and the total loop width
  let offsets = [];
  let totalWidth = 0;
  function recomputeTotal() {
    offsets = [];
    let acc = 0;
    for (let i = 0; i < sources.length; i++) {
      offsets.push(acc);
      acc += slotWidth();
    }
    totalWidth = acc;
  }
  recomputeTotal();

  // scroll value that puts panel `idx` dead-center. idx is an unbounded
  // integer (loop k, source = idx mod N) so the arrows can aim at the nearest
  // copy of a panel across the wrap.
  function centerForIndex(idx) {
    const N = sources.length;
    const loop = Math.floor(idx / N);
    const s = ((idx % N) + N) % N;
    return offsets[s] + slotWidth() / 2 - CONFIG.GAP / 2 + loop * totalWidth;
  }

  // integer index (including loop) whose center is closest to `value`
  function nearestIndex(value) {
    if (!totalWidth) return 0;
    const N = sources.length;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < N; i++) {
      const center = offsets[i] + slotWidth() / 2 - CONFIG.GAP / 2;
      const k = Math.round((value - center) / totalWidth);
      const dist = Math.abs(center + k * totalWidth - value);
      if (dist < bestDist) {
        bestDist = dist;
        best = i + k * N;
      }
    }
    return best;
  }

  // which source index is closest to screen center (for the caption)
  function centerIndex(value) {
    const N = sources.length;
    return ((nearestIndex(value) % N) + N) % N;
  }
  let lastCenter = -1;

  // ---- mesh pool ----
  // REPEATS copies of the whole image set so wide screens never run dry.
  const REPEATS = 4;
  const pool = [];
  for (let r = 0; r < REPEATS; r++) {
    for (let i = 0; i < sources.length; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xdddddd,
        transparent: true,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), mat);
      mesh.visible = false;
      scene.add(mesh);
      pool.push({ mesh, mat, srcIndex: i });
    }
  }

  // ---- scroll state ----
  let scroll = centerForIndex(0); // current (image 01 centered)
  let target = scroll; // desired
  let velocity = 0; // flick momentum after a drag release
  let prevScroll = scroll; // seeded, so frame one reads as zero speed
  let scrollEnergy = 0; // smoothed 0..1 drag activity, drives panel shrink
  let lastInput = performance.now(); // timestamp of last drag / arrow input
  let snapped = false; // have we already snapped since the last input?
  let stepping = false; // an arrow step is travelling (keeps the normal ease)

  // ---- liquid-glass lens: FBO + fullscreen pass ----
  // The carousel renders into rt at device resolution (CSS-sized would render
  // at 1x and upscale — blurry on retina); a fullscreen quad then samples it
  // through the lens shader.
  const dpr = renderer.getPixelRatio();
  let rt = new THREE.WebGLRenderTarget(W * dpr, H * dpr);
  const lensScene = new THREE.Scene();
  const lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const lensUniforms = {
    uTex: { value: rt.texture },
    uRes: { value: new THREE.Vector2(W * dpr, H * dpr) },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uSizeX: { value: LENS.sizeX },
    uSizeY: { value: LENS.sizeY },
    uShape: { value: LENS.shape === "square" ? 1.0 : 0.0 },
    uSquareRound: { value: LENS.squareRound },
    uRotation: { value: 0.0 },
    uAspect: { value: W / H },
    uZoom: { value: LENS.zoom },
    uDispersion: { value: LENS.dispersion },
    uBlur: { value: LENS.blur },
    uGlow: { value: LENS.glow },
    uWhiteGlow: { value: LENS.whiteGlow },
    uNovaSize: { value: LENS.novaSize },
    uBlueRing: { value: LENS.blueRing },
    uRingRadius: { value: LENS.ringRadius },
    uRingWidth: { value: LENS.ringWidth },
    uShimmer: { value: LENS.shimmer ? 1.0 : 0.0 },
    uShimmerFreq: { value: LENS.shimmerFreq },
    uShimmerSpeed: { value: LENS.shimmerSpeed },
    uShimmerDepth: { value: LENS.shimmerDepth },
    uTime: { value: 0.0 },
    uRimStart: { value: LENS.rimStart },
    uRimTangential: { value: LENS.rimTangential },
    uRimInward: { value: LENS.rimInward },
    uRimFreq1: { value: LENS.rimFreq1 },
    uRimFreq2: { value: LENS.rimFreq2 },
    uBlueColor: { value: new THREE.Color(LENS.blueColor) },
    uRimLine: { value: LENS.rimLine },
    uRimLinePos: { value: LENS.rimLinePos },
    uRimLineWidth: { value: LENS.rimLineWidth },
    uVignette: { value: LENS.vignette },
    uVignetteSize: { value: LENS.vignetteSize },
    uSamples: { value: LENS.samples },
  };
  const lensMat = new THREE.ShaderMaterial({
    uniforms: lensUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      #define PI 3.14159265
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform vec2  uRes;
      uniform vec2  uCenter;
      uniform float uSizeX;         // half-width (height-fraction units)
      uniform float uSizeY;         // half-height (height-fraction units)
      uniform float uAspect;        // W/H
      uniform float uZoom;
      uniform float uDispersion;
      uniform float uBlur;
      uniform float uGlow;
      uniform float uWhiteGlow;
      uniform float uNovaSize;
      uniform float uBlueRing;
      uniform float uRingRadius;
      uniform float uRingWidth;
      uniform float uShimmer;
      uniform float uShimmerFreq;
      uniform float uShimmerSpeed;
      uniform float uShimmerDepth;
      uniform float uTime;
      uniform float uRimStart;
      uniform float uRimTangential;
      uniform float uRimInward;
      uniform float uRimFreq1;
      uniform float uRimFreq2;
      uniform vec3  uBlueColor;
      uniform float uRimLine;
      uniform float uRimLinePos;
      uniform float uRimLineWidth;
      uniform float uVignette;     // overall vignette strength (0 = off)
      uniform float uVignetteSize; // radius where vignette begins
      uniform float uShape;        // 0 = circle, 1 = square
      uniform float uSquareRound;  // corner rounding for square (0..1)
      uniform float uRotation;     // lens rotation in radians
      uniform int   uSamples;

      const int MAX_SAMPLES = 16;

      // rounded-box signed distance (negative inside)
      float sdRoundBox(vec2 p, vec2 b, float r){
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
      }

      // Evaluate the disc lens centered at 'center' (screen-UV). Returns the
      // lensed color; 'outA' = how opaque this lens is here (0 outside disc).
      vec3 discLens(vec2 center, float aspectCorrect, out float outA) {
        // local coords, aspect-corrected so x/y are in the same screen units
        vec2 p = (vUv - center);
        p.x *= aspectCorrect;
        // rotate local space so the rect + all internals spin together
        float ca = cos(uRotation), sa = sin(uRotation);
        p = mat2(ca, -sa, sa, ca) * p;
        vec2 halfSize = vec2(uSizeX, uSizeY);
        // elliptical distance: 0 center .. 1 boundary
        float dist = length(p / halfSize);
        outA = 0.0;

        // mask shape: ellipse OR rounded rect, drives the cutoff.
        // maskND: 0 inside .. 1 at the shape boundary (>1 outside).
        float maskND;
        if (uShape > 0.5) {
          float corner = min(uSizeX, uSizeY) * clamp(uSquareRound, 0.0, 1.0);
          float sd = sdRoundBox(p, halfSize, corner);
          maskND = 1.0 + sd / min(uSizeX, uSizeY);
        } else {
          maskND = dist;
        }
        if (maskND > 1.0) return vec3(0.0);

        // shapeND: 0 center .. 1 boundary, following the chosen shape. Used by
        // nova / ring / border so they take the SAME shape.
        float shapeND = clamp(maskND, 0.0, 1.0);

        // deflection uses the elliptical radial nd so it bends smoothly from
        // the center even when the boundary is rectangular
        float nd = clamp(dist, 0.0, 1.0);
        vec2  offset = vUv - center;
        vec2  radialDir = normalize(offset + 1e-6);
        vec2  tangentDir = vec2(-radialDir.y, radialDir.x);
        // angle measured in ROTATED local space so the rim wave/shimmer spin too
        float angle = atan(p.y, p.x);

        // inward pull + fluid rim waves
        float pull = uZoom * 0.30 * (nd * nd);
        float rimStrength = smoothstep(uRimStart, 1.0, nd);
        float fluidWave = sin(angle * uRimFreq1) * 0.55 + sin(angle * uRimFreq2) * 0.25;
        float rScreen = (uSizeX + uSizeY) * 0.5;
        vec2  rimOff = tangentDir * fluidWave * rimStrength * rScreen * uRimTangential;
        vec2  rimPull = -radialDir * rimStrength * rScreen * uRimInward;

        vec2 baseUV = center + offset * (1.0 - pull) + rimOff + rimPull;

        // chromatic dispersion (weighted multi-sample, per-channel normalized)
        float rimMask = smoothstep(0.55, 1.0, nd);
        vec2  dispDir = offset * uDispersion * 0.004 * rimMask;
        int N = uSamples;
        if (N < 2) N = 2;
        if (N > MAX_SAMPLES) N = MAX_SAMPLES;
        vec3 col = vec3(0.0);
        vec3 caW = vec3(0.0);
        for (int i = 0; i < MAX_SAMPLES; i++) {
          if (i >= N) break;
          float t = float(i) / float(N - 1);
          vec2 sUV = baseUV + dispDir * (t - 0.5);
          vec3 s = texture2D(uTex, sUV).rgb;
          vec3 w = vec3(
            exp(-pow((t - 0.00) / 0.38, 2.0)),
            exp(-pow((t - 0.50) / 0.38, 2.0)),
            exp(-pow((t - 1.00) / 0.38, 2.0))
          );
          col += s * w;
          caW += w;
        }
        col /= max(caW, vec3(0.001));

        // optional blur near the rim
        float blurFade = 1.0 - smoothstep(0.72, 0.98, nd);
        if (uBlur > 0.01 && blurFade > 0.01) {
          vec2 blurRad = vec2(uBlur) / uRes * blurFade;
          vec3 bcol = vec3(0.0);
          float btw = 0.0;
          for (float a = 0.0; a < PI * 2.0; a += PI * 2.0 / 6.0) {
            for (float rr = 0.4; rr <= 1.001; rr += 0.3) {
              vec2 o = vec2(cos(a), sin(a)) * blurRad * rr;
              float w = 1.0 - rr * 0.38;
              bcol += texture2D(uTex, baseUV + o).rgb * w;
              btw += w;
            }
          }
          col = mix(bcol / btw, col, rimMask);
        }

        // glassy darkening toward center
        col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));

        // white nova glow at center
        float r2 = shapeND * shapeND * 0.25;
        float gs = max(uNovaSize * uGlow * 0.003, 0.004);
        float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;
        nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
        col += vec3(nova);

        // blue ring + aura
        float dC = shapeND * 0.5;
        float tR = clamp(uRingRadius, 0.1, 0.49);
        float rW = max(uRingWidth, 0.003);
        float ring = exp(-pow((dC - tR) / rW, 2.0));
        ring *= uBlueRing * (uGlow / 17.0) * 1.8;
        if (uShimmer > 0.5) ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) * uShimmerDepth + (1.0 - uShimmerDepth);
        float ringAura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) * 0.28 * uBlueRing * (uGlow / 17.0);
        col += uBlueColor * (ring + ringAura);
        // bright border line
        col += vec3(exp(-pow((dC - uRimLinePos) / max(uRimLineWidth, 0.0001), 2.0)) * uRimLine);

        // lens alpha: solid inside, soft falloff at the very edge
        outA = smoothstep(1.0, 0.93, maskND);
        return col;
      }

      void main(){
        vec3 base = texture2D(uTex, vUv).rgb;  // carousel, untouched
        vec3 outc = base;

        float a = 0.0;
        vec3 c = discLens(uCenter, uAspect, a);
        outc = mix(outc, c, a);

        // overall vignette: darken toward screen corners (aspect-correct)
        if (uVignette > 0.001) {
          vec2 vc = vUv - 0.5;
          vc.x *= uAspect;
          float d = length(vc) / max(uVignetteSize, 0.0001);
          float vig = 1.0 - uVignette * smoothstep(0.5, 1.0, d);
          outc *= clamp(vig, 0.0, 1.0);
        }

        gl_FragColor = vec4(outc, 1.0);
      }
    `,
  });
  const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat);
  lensScene.add(lensQuad);

  // ---- layout: place pooled meshes for the current scroll (every frame) ----
  let panelRects = []; // visible panel screen rects for hit-testing
  function layout() {
    panelRects = [];
    const half = W / 2;
    // fixed 16:9 box for every panel; shrink up to 25% with drag speed
    const shrink = 1 - 0.25 * scrollEnergy;
    const h = CONFIG.PANEL_H * shrink;
    const wPx = h * CONFIG.ASPECT;
    const buffer = wPx;
    pool.forEach((p, poolIdx) => {
      const rep = Math.floor(poolIdx / sources.length);
      const i = p.srcIndex;
      const src = sources[i];

      // slot center within one loop, shifted by scroll, wrapped, then pushed
      // out by this pool entry's repetition rung
      const slotCenterInLoop = offsets[i] + slotWidth() / 2 - CONFIG.GAP / 2;
      let x = slotCenterInLoop - scroll;
      x = ((x % totalWidth) + totalWidth) % totalWidth;
      x += (rep - Math.floor(REPEATS / 2)) * totalWidth;
      if (x > half + totalWidth) x -= totalWidth * REPEATS;

      const centerX = x;
      if (centerX < -half - buffer || centerX > half + buffer) {
        p.mesh.visible = false;
        return;
      }

      // bind texture once available
      if (src.tex && !p.bound) {
        p.mat.map = src.tex;
        p.mat.color.set(0xffffff);
        p.mat.needsUpdate = true;
        p.bound = true;
      }

      p.mesh.visible = true;
      p.mesh.position.set(centerX, CONFIG.OFFSET_Y, 0);
      p.mesh.scale.set(wPx, h, 1);

      // screen rect (px, top-left origin) for pointer hit-testing and for
      // parking the hover overlay
      const sx = centerX + W / 2;
      const sy = H / 2 - CONFIG.OFFSET_Y;
      panelRects.push({
        left: sx - wPx / 2,
        top: sy - h / 2,
        width: wPx,
        height: h,
        right: sx + wPx / 2,
        bottom: sy + h / 2,
        poolIdx,
        srcIndex: i,
        centerX,
      });
    });
  }

  // which visible panel (if any) is under a canvas-local point?
  function panelAtPointer(px, py) {
    for (let i = 0; i < panelRects.length; i++) {
      const r = panelRects[i];
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom)
        return r;
    }
    return null;
  }

  const el = renderer.domElement;
  // Touch hardening: own horizontal gestures outright, but leave vertical to
  // the browser so the page still scrolls past the carousel. Also kill the
  // mobile text-select + tap-flash artifacts a long press otherwise fires.
  el.style.touchAction = "pan-y";
  el.style.userSelect = "none";
  el.style.setProperty("-webkit-user-select", "none");
  el.style.setProperty("-webkit-touch-callout", "none");
  el.style.setProperty("-webkit-tap-highlight-color", "transparent");

  // ---- drag state ----
  let dragging = false; // a pointer is currently pulling the row
  let dragPointerId = null; // which pointer we captured
  let dragLastX = 0; // last pointer x (px) — per-move delta source
  let dragDist = 0; // total px travelled this press (click vs drag test)
  let dragVel = 0; // smoothed drag speed, handed to `velocity` on release
  let dragMoveT = 0; // timestamp of the last drag move (flick gating)
  let suppressClick = false; // this press ended as a drag -> eat its click
  let dragPointerType = "mouse"; // "mouse" | "touch" | "pen" for this press
  let lastPointerX = NaN; // last known pointer position (canvas-local), so the
  let lastPointerY = NaN; // hover test can re-run when the row moves
  let pointerInside = false; // pointer is within the canvas
  let lastPointerType = "mouse"; // pointer type of the most recent event

  // The canvas no longer starts at the top of the page — there's a full
  // section above it — so client coords need the canvas origin subtracted.
  // Cached, and thrown away whenever the page scrolls or resizes.
  let boundsCache = null;
  function bounds() {
    if (!boundsCache) boundsCache = el.getBoundingClientRect();
    return boundsCache;
  }
  function invalidateBounds() {
    boundsCache = null;
  }

  let hoverSrcIndex = -1; // source index under the mouse (-1 = none)

  // Cursor writes are deduped — updateCursor runs every frame and there's no
  // reason to touch the CSSOM when nothing changed.
  let cursorNow = "";
  function setCursor(v) {
    if (v === cursorNow) return;
    cursorNow = v;
    el.style.cursor = v;
  }

  // Single source of truth for the canvas cursor. Priority: grabbing while a
  // drag is live -> grab/pointer over a panel -> default.
  function updateCursor() {
    if (dragging) return setCursor("grabbing");
    if (hoverSrcIndex < 0) return setCursor(""); // off the carousel, plain arrow
    if (INTERACT.drag) return setCursor("grab");
    return setCursor(INTERACT.noClick ? "" : "pointer");
  }

  // The pointer isn't the only thing that moves — the row slides underneath
  // it. Re-testing only on pointer events left the hover state stale whenever
  // the carousel moved beneath a still cursor: a panel arriving under the
  // pointer got no grab hand until you jiggled. Called every frame, right
  // after layout() rebuilds panelRects.
  function refreshHover() {
    // hover is mouse-only: a finger has no hover state to describe, and the
    // overlay would just park wherever you last tapped. A live drag hides it
    // too — the grabbing hand carries that interaction on its own.
    const hit =
      pointerInside &&
      lastPointerType === "mouse" &&
      !dragging &&
      Number.isFinite(lastPointerX)
        ? panelAtPointer(lastPointerX, lastPointerY)
        : null;

    const next = hit ? hit.srcIndex : -1;
    if (next !== hoverSrcIndex) {
      hoverSrcIndex = next;
      onHoverChange(next);
    }
    updateCursor();

    // park the overlay over the hovered panel (React owns its fade)
    if (overlayElement && hit) {
      const s = overlayElement.style;
      s.transform = `translate3d(${hit.left}px, ${hit.top}px, 0)`;
      s.width = `${hit.width}px`;
      s.height = `${hit.height}px`;
    }
  }

  // ---- input ----
  function onPointerDown(e) {
    suppressClick = false;
    const b = bounds();
    lastPointerX = e.clientX - b.left;
    lastPointerY = e.clientY - b.top;
    if (!INTERACT.drag) return;
    if (dragging) return; // a second finger never hijacks a live drag
    if (e.button !== 0 && e.pointerType === "mouse") return; // left button only
    dragging = true;
    dragPointerId = e.pointerId;
    dragPointerType = e.pointerType || "mouse";
    try {
      el.setPointerCapture(e.pointerId); // keep receiving moves off-canvas
    } catch {}
    dragLastX = e.clientX;
    dragDist = 0;
    dragVel = 0;
    dragMoveT = performance.now();
    velocity = 0; // grabbing kills any leftover momentum
    stepping = false; // and cancels an arrow step in flight
    snapped = false; // re-arm the snap for when the drag ends
    lastInput = dragMoveT;
    updateCursor();
  }

  function onPointerMove(e) {
    // ---- drag: pull the row with the pointer ----
    // Only the captured pointer drives it, so extra fingers are inert.
    if (dragging && e.pointerId === dragPointerId) {
      const sens =
        dragPointerType === "mouse" ? CONFIG.DRAG : INTERACT.TOUCH_DRAG;
      const dx = e.clientX - dragLastX;
      dragLastX = e.clientX;
      dragDist += Math.abs(dx);
      target -= dx * sens; // pointer right = row travels back
      // smoothed so a single jittery frame can't define the flick
      dragVel = dragVel * 0.6 + -dx * sens * 0.4;
      dragMoveT = performance.now();
      lastInput = dragMoveT;
      snapped = false;
    }
    const b = bounds();
    lastPointerX = e.clientX - b.left;
    lastPointerY = e.clientY - b.top;
    lastPointerType = e.pointerType || "mouse";
    pointerInside = true; // in case the enter event was missed
  }

  function onPointerUp(e) {
    if (!dragging) return;
    // ignore lifts from fingers that were never driving the drag
    if (e && dragPointerId !== null && e.pointerId !== dragPointerId) return;
    dragging = false;
    if (dragPointerId !== null) {
      try {
        el.releasePointerCapture(dragPointerId);
      } catch {}
      dragPointerId = null;
    }
    // Only flick if the pointer was still moving at release — letting go after
    // holding still should stop dead, not launch.
    velocity =
      performance.now() - dragMoveT > INTERACT.FLICK_IDLE_MS ? 0 : dragVel;
    dragVel = 0;
    lastInput = performance.now();
    snapped = false; // the idle timer takes over and snaps to center
    suppressClick =
      dragDist >
      (dragPointerType === "mouse"
        ? INTERACT.CLICK_SLOP
        : INTERACT.TOUCH_CLICK_SLOP);
    updateCursor();
  }

  function onEnter(e) {
    pointerInside = true;
    lastPointerType = e.pointerType || "mouse";
  }
  function onLeave() {
    pointerInside = false;
  }

  // A panel is a link: a real click hands its index to the host, which
  // navigates. A drag's trailing click is eaten instead.
  function onClick(e) {
    if (suppressClick) {
      suppressClick = false; // that "click" was the tail of a drag
      return;
    }
    if (INTERACT.noClick) return;
    const b = bounds();
    const hit = panelAtPointer(e.clientX - b.left, e.clientY - b.top);
    if (!hit) return;
    onSelect(hit.srcIndex);
  }

  // Move the row exactly one panel (dir -1 / +1) — the pagination arrows.
  // Steps from wherever the row is *heading* so repeated clicks queue up
  // instead of all resolving to the same neighbour.
  function step(dir) {
    const from = nearestIndex(Math.abs(target - scroll) > 1 ? target : scroll);
    target = centerForIndex(from + (dir > 0 ? 1 : -1));
    velocity = 0;
    stepping = true;
    snapped = true; // already aimed at a panel center; don't re-snap
    lastInput = performance.now();
  }

  // Toggle drag / panel links at runtime (the GUI drives this). Keeps the
  // invariant that link-free mode needs drag on, and that turning drag off
  // gives clicking back — otherwise the mouse would do nothing at all.
  function setInteraction(next = {}) {
    if (next.drag !== undefined) {
      INTERACT.drag = next.drag;
      if (!INTERACT.drag) {
        INTERACT.noClick = false;
        if (dragging) onPointerUp();
      }
    }
    if (next.noClick !== undefined) {
      INTERACT.noClick = next.noClick;
      if (INTERACT.noClick) INTERACT.drag = true;
    }
    updateCursor();
    onModeChange({ drag: INTERACT.drag, noClick: INTERACT.noClick });
  }

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("click", onClick);
  window.addEventListener("scroll", invalidateBounds, { passive: true });

  // ---- animation loop ----
  let raf;
  function tick() {
    if (!dragging) {
      // flick momentum from a drag release, decaying to nothing
      target += velocity;
      velocity *= CONFIG.FRICTION;
      if (Math.abs(velocity) < 0.05) velocity = 0;

      // Settle-snap once input has actually stopped (idle time since the last
      // drag event). Retargets from the CURRENT scroll so it always locks
      // onto whichever panel is truly nearest right now.
      if (
        CONFIG.SNAP &&
        !snapped &&
        performance.now() - lastInput > CONFIG.SNAP_IDLE_MS
      ) {
        target = centerForIndex(nearestIndex(scroll));
        snapped = true;
      }
    }

    // Once snapped, glide in slower (SNAP_EASE < EASE) so the settle reads as
    // a soft landing rather than a speed-up. A live touch drag overrides both
    // and follows the finger hard — the weighty lerp reads as lag when you're
    // physically touching the row. An arrow step keeps the normal ease: it's a
    // deliberate journey to the next panel, not a settle.
    if (stepping && Math.abs(target - scroll) < 0.5) stepping = false;
    const follow =
      dragging && dragPointerType !== "mouse"
        ? INTERACT.TOUCH_EASE
        : snapped && !stepping
          ? CONFIG.SNAP_EASE
          : CONFIG.EASE;
    scroll += (target - scroll) * follow;

    // tell the host which image is centered (caption text)
    const ci = centerIndex(scroll);
    if (ci !== lastCenter) {
      lastCenter = ci;
      onActiveChange(ci);
    }

    // drag speed -> energy 0..1, drives the panel shrink. Attack fast when
    // speeding up, decay slow when settling.
    const rawSpeed = scroll - prevScroll;
    prevScroll = scroll;
    const norm = Math.min(
      1,
      Math.abs(rawSpeed) / Math.max(1, CONFIG.SHRINK_MAX),
    );
    const k = norm > scrollEnergy ? CONFIG.SHRINK_ATTACK : CONFIG.SHRINK_DECAY;
    scrollEnergy += (norm - scrollEnergy) * k;

    layout();
    refreshHover(); // panels just moved — the hover state may be stale

    // lens uniforms
    lensUniforms.uCenter.value.set(LENS.posX, LENS.posY);
    lensUniforms.uAspect.value = W / H;
    lensUniforms.uTime.value = performance.now() * 0.001;
    const rad = (a) => (a * Math.PI) / 180;
    lensUniforms.uRotation.value =
      rad(LENS.rotation) + rad(LENS.spin) * (performance.now() * 0.001);

    // render the carousel into the FBO, then the FBO through the lens
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(lensScene, lensCam);

    raf = requestAnimationFrame(tick);
  }
  tick();

  // ---- resize / teardown ----
  function onResize() {
    invalidateBounds();
    W = mount.clientWidth;
    H = mount.clientHeight;
    renderer.setSize(W, H);
    camera.left = -W / 2;
    camera.right = W / 2;
    camera.top = H / 2;
    camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    rt.setSize(W * dpr, H * dpr);
    lensUniforms.uRes.value.set(W * dpr, H * dpr);
  }
  window.addEventListener("resize", onResize);

  function destroy() {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", invalidateBounds);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("click", onClick);
    renderer.dispose();
    rt.dispose();
    lensQuad.geometry.dispose();
    lensMat.dispose();
    pool.forEach((p) => {
      p.mesh.geometry.dispose();
      p.mat.dispose();
    });
    sources.forEach((s) => {
      if (s.tex) s.tex.dispose();
    });
    if (renderer.domElement.parentNode)
      renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return {
    step, // move one panel back / forward (pagination arrows)
    refreshLayout: recomputeTotal, // call after changing PANEL_H / GAP
    setInteraction, // toggle drag / panel links at runtime
    lensUniforms, // exposed for the dev GUI
    destroy,
  };
}
