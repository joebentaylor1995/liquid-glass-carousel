// Optional lil-gui dev panel for tuning the carousel live. Hidden by default —
// press "g" to toggle it. Sliders mutate the config objects directly, so the
// numbers you land on can be copied back into config.js as the new defaults.
import GUI from "lil-gui";
import { CONFIG, INTERACT, LENS, HOVER } from "./config";

// takes the object returned by createCarousel()
export function createCarouselGui(carousel) {
  const { lensUniforms, refreshLayout, setInteraction } = carousel;

  const gui = new GUI({ title: "Carousel" });
  gui.hide(); // hidden until "g" (see the keydown handler at the bottom)

  gui
    .add(CONFIG, "PANEL_H", 10, 600, 1)
    .name("panel height")
    .onChange(refreshLayout);
  gui.add(CONFIG, "GAP", 0, 120, 1).name("gap").onChange(refreshLayout);
  gui.add(CONFIG, "RADIUS", 0, 60, 1).name("corner radius");
  gui.add(CONFIG, "OFFSET_Y", -200, 300, 1).name("row offset y");

  const scrollFolder = gui.addFolder("Drag & Snap");
  scrollFolder.add(CONFIG, "EASE", 0.02, 0.3, 0.005).name("glide ease");
  scrollFolder.add(CONFIG, "FRICTION", 0.8, 0.985, 0.005).name("momentum decay");
  scrollFolder.add(CONFIG, "SNAP").name("settle snap");
  scrollFolder.add(CONFIG, "SNAP_IDLE_MS", 20, 500, 10).name("snap idle (ms)");
  scrollFolder.add(CONFIG, "SNAP_EASE", 0.01, 0.12, 0.005).name("snap ease");

  // drag / noClick are interlocked (see setInteraction in engine.js), so both
  // controllers refresh their display after either one changes
  const interactFolder = gui.addFolder("Interaction");
  const dragCtrl = interactFolder
    .add(INTERACT, "drag")
    .name("draggable")
    .onChange((v) => {
      setInteraction({ drag: v });
      noClickCtrl.updateDisplay();
    });
  interactFolder.add(CONFIG, "DRAG", 0.2, 4, 0.05).name("drag sensitivity");
  interactFolder
    .add(INTERACT, "TOUCH_DRAG", 0.2, 3, 0.05)
    .name("touch sensitivity");
  interactFolder.add(INTERACT, "TOUCH_EASE", 0.05, 1, 0.01).name("touch follow");
  const noClickCtrl = interactFolder
    .add(INTERACT, "noClick")
    .name("no links (drag only)")
    .onChange((v) => {
      setInteraction({ noClick: v });
      dragCtrl.updateDisplay();
    });

  const hoverFolder = gui.addFolder("Hover Overlay");
  hoverFolder.add(HOVER, "scrim", 0, 1, 0.01).name("scrim opacity");
  hoverFolder.add(HOVER, "fade", 0.05, 1.5, 0.05).name("fade (s)");
  hoverFolder.add(HOVER, "maxTags", 1, 8, 1).name("tags shown");

  const lensFolder = gui.addFolder("Lens");

  // which of the three fullscreen effects runs
  lensFolder.add(LENS, "mode", ["glass", "bulge", "sphere"]).name("effect");

  const sphereFolder = lensFolder.addFolder("Sphere wrap");
  sphereFolder.add(LENS, "sphereCurve", 0, 2, 0.01).name("curve toward you");
  sphereFolder.add(LENS, "sphereSqueeze", 0, 1.5, 0.01).name("foreshorten");
  sphereFolder.add(LENS, "sphereShade", 0, 0.6, 0.01).name("edge shading");
  sphereFolder.add(LENS, "sphereFlat", -0.3, 0.5, 0.005).name("flat margin");

  const bulgeFolder = lensFolder.addFolder("Bulge");
  bulgeFolder.add(LENS, "bulgeCurve", 0, 2, 0.01).name("swell at ends");
  bulgeFolder.add(LENS, "bulgeSpread", 0, 1, 0.01).name("outward stretch");
  bulgeFolder.add(LENS, "bulgeShade", 0, 0.6, 0.01).name("edge shading");

  // how far the effect stays off the middle of the screen — shared by both
  // modes. Drag "clear centre" negative to let it bite across the active card.
  const edgeFolder = lensFolder.addFolder("Edge falloff");
  edgeFolder.add(LENS, "edgeClear", -1, 1, 0.005).name("clear centre");
  edgeFolder.add(LENS, "edgeFeather", 0.01, 1, 0.005).name("falloff width");

  lensFolder
    .add(LENS, "shape", ["circle", "square"])
    .onChange((v) => (lensUniforms.uShape.value = v === "square" ? 1.0 : 0.0));
  lensFolder
    .add(LENS, "squareRound", 0, 1, 0.01)
    .name("corner round")
    .onChange((v) => (lensUniforms.uSquareRound.value = v));
  lensFolder.add(LENS, "rotation", -180, 180, 1).name("rotation°");
  lensFolder.add(LENS, "spin", -180, 180, 1).name("spin °/s");
  lensFolder
    .add(LENS, "sizeX", 0.03, 0.6, 0.005)
    .name("width")
    .onChange((v) => (lensUniforms.uSizeX.value = v));
  lensFolder
    .add(LENS, "sizeY", 0.03, 0.6, 0.005)
    .name("height")
    .onChange((v) => (lensUniforms.uSizeY.value = v));
  lensFolder
    .add(LENS, "posX", 0, 1, 0.005)
    .name("pos X")
    .onChange((v) => (lensUniforms.uCenter.value.x = v));
  lensFolder
    .add(LENS, "posY", 0, 1, 0.005)
    .name("pos Y")
    .onChange((v) => (lensUniforms.uCenter.value.y = v));
  lensFolder
    .add(LENS, "zoom", 0, 2, 0.01)
    .name("inward pull")
    .onChange((v) => (lensUniforms.uZoom.value = v));
  lensFolder
    .add(LENS, "dispersion", 0, 120, 1)
    .onChange((v) => (lensUniforms.uDispersion.value = v));
  lensFolder
    .add(LENS, "blur", 0, 20, 0.1)
    .onChange((v) => (lensUniforms.uBlur.value = v));
  lensFolder
    .add(LENS, "samples", 2, 16, 1)
    .onChange((v) => (lensUniforms.uSamples.value = v));
  lensFolder
    .add(LENS, "vignette", 0, 1, 0.01)
    .name("vignette")
    .onChange((v) => (lensUniforms.uVignette.value = v));
  lensFolder
    .add(LENS, "vignetteSize", 0.3, 1.5, 0.01)
    .name("vignette size")
    .onChange((v) => (lensUniforms.uVignetteSize.value = v));

  const glowFolder = lensFolder.addFolder("Glow / nova / ring");
  glowFolder
    .add(LENS, "glow", 0, 40, 0.1)
    .onChange((v) => (lensUniforms.uGlow.value = v));
  glowFolder
    .add(LENS, "whiteGlow", 0, 1, 0.005)
    .name("white glow")
    .onChange((v) => (lensUniforms.uWhiteGlow.value = v));
  glowFolder
    .add(LENS, "novaSize", 0.1, 12, 0.1)
    .name("nova size")
    .onChange((v) => (lensUniforms.uNovaSize.value = v));
  glowFolder
    .add(LENS, "blueRing", 0, 6, 0.05)
    .name("blue ring")
    .onChange((v) => (lensUniforms.uBlueRing.value = v));
  glowFolder
    .add(LENS, "ringRadius", 0.1, 0.49, 0.005)
    .name("ring radius")
    .onChange((v) => (lensUniforms.uRingRadius.value = v));
  glowFolder
    .add(LENS, "ringWidth", 0.003, 0.3, 0.001)
    .name("ring width")
    .onChange((v) => (lensUniforms.uRingWidth.value = v));
  glowFolder
    .add(LENS, "shimmer")
    .onChange((v) => (lensUniforms.uShimmer.value = v ? 1.0 : 0.0));
  glowFolder
    .add(LENS, "shimmerFreq", 1, 60, 1)
    .name("shimmer freq")
    .onChange((v) => (lensUniforms.uShimmerFreq.value = v));
  glowFolder
    .add(LENS, "shimmerSpeed", 0, 20, 0.1)
    .name("shimmer speed")
    .onChange((v) => (lensUniforms.uShimmerSpeed.value = v));
  glowFolder
    .add(LENS, "shimmerDepth", 0, 0.5, 0.005)
    .name("shimmer depth")
    .onChange((v) => (lensUniforms.uShimmerDepth.value = v));
  glowFolder
    .add(LENS, "rimLine", 0, 2, 0.01)
    .name("white border")
    .onChange((v) => (lensUniforms.uRimLine.value = v));
  glowFolder
    .add(LENS, "rimLinePos", 0.1, 0.5, 0.001)
    .name("border pos")
    .onChange((v) => (lensUniforms.uRimLinePos.value = v));
  glowFolder
    .add(LENS, "rimLineWidth", 0.001, 0.05, 0.0005)
    .name("border width")
    .onChange((v) => (lensUniforms.uRimLineWidth.value = v));

  const rimFolder = lensFolder.addFolder("Rim fluid wave");
  rimFolder
    .add(LENS, "rimStart", 0, 1, 0.001)
    .onChange((v) => (lensUniforms.uRimStart.value = v));
  rimFolder
    .add(LENS, "rimTangential", 0, 0.6, 0.001)
    .onChange((v) => (lensUniforms.uRimTangential.value = v));
  rimFolder
    .add(LENS, "rimInward", 0, 1, 0.001)
    .onChange((v) => (lensUniforms.uRimInward.value = v));
  rimFolder
    .add(LENS, "rimFreq1", 1, 40, 1)
    .onChange((v) => (lensUniforms.uRimFreq1.value = v));
  rimFolder
    .add(LENS, "rimFreq2", 1, 40, 1)
    .onChange((v) => (lensUniforms.uRimFreq2.value = v));
  lensFolder
    .addColor(LENS, "blueColor")
    .name("blue color")
    .onChange((v) => lensUniforms.uBlueColor.value.set(v));

  // dump the current lens settings, ready to paste back into config.js
  lensFolder
    .add(
      {
        copy: () => {
          const json = JSON.stringify(LENS, null, 2);
          console.log(json);
          navigator.clipboard?.writeText(json).catch(() => {});
        },
      },
      "copy",
    )
    .name("⧉ copy lens settings");

  // The panel leads with the shader: everything else starts collapsed so the
  // lens controls are what you see when it opens.
  scrollFolder.close();
  interactFolder.close();
  hoverFolder.close();
  lensFolder.open();
  sphereFolder.open();
  bulgeFolder.close();
  glowFolder.open();
  rimFolder.open();
  edgeFolder.open();

  // the panel starts hidden, so give it a way back: "g" toggles it (ignored
  // while typing into one of the GUI's own number fields)
  let visible = false;
  function onKeyDown(e) {
    if (e.key !== "g" && e.key !== "G") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.isContentEditable)) return;
    visible = !visible;
    if (visible) gui.show();
    else gui.hide();
  }
  window.addEventListener("keydown", onKeyDown);

  return {
    gui,
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      gui.destroy();
    },
  };
}
