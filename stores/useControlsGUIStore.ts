import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";

import {
  DEFAULT_EFFECT_SPEED,
  MAX_EFFECT_SPEED,
  MIN_EFFECT_SPEED,
  STEP_EFFECT_SPEED,
} from "~/constants";
import { DEFAULT_DROP_DEPTH, DEFAULT_DROP_SIZE } from "~/effects/Drop";
import {
  MAX_DROP_DEPTH,
  MAX_DROP_SIZE,
  MAX_INTENSITY,
  MIN_DROP_DEPTH,
  MIN_DROP_SIZE,
  MIN_INTENSITY,
  RAIN_MODE,
  type RainMode,
  STEP_DROP_DEPTH,
  STEP_DROP_SIZE,
  STEP_INTENSITY,
} from "~/effects/RainSystem";
import { GUI, type LilGUIOptions } from "~/utils/GUI";

interface Controls {
  speed: number;
  // CURSOR DROP CONTROLLERS
  cursorDropSize: number;
  cursorDropDepth: number;
  cursorDropEnabled: boolean;
  // RAIN SYSTEM CONTROLLERS
  rainIntensity: number;
  rainMode: RainMode;
}

const gui = shallowRef<GUI<Controls> | null>(null);

export const useControlsGUIStore = defineStore("controlsGUI", () => {
  const controls = ref({
    // GENERAL CONTROLLERS
    speed: DEFAULT_EFFECT_SPEED,
    // CURSOR DROP CONTROLLERS
    cursorDropSize: DEFAULT_DROP_SIZE,
    cursorDropDepth: DEFAULT_DROP_DEPTH,
    cursorDropEnabled: false,
    // RAIN SYSTEM CONTROLLERS
    rainIntensity: MIN_INTENSITY,
    rainMode: RAIN_MODE.ONE_BY_ONE as RainMode,
  } as Controls);

  const init = async (options: LilGUIOptions) => {
    if (gui.value) {
      gui.value.destroy();
    }

    gui.value = new GUI(options, controls.value);

    gui.value.add("speed", MIN_EFFECT_SPEED, MAX_EFFECT_SPEED, STEP_EFFECT_SPEED).name("Speed");

    const cursorDropEffectFolder = gui.value.addFolder("Cursor drop effect");
    cursorDropEffectFolder.add("cursorDropEnabled").name("Enabled");
    cursorDropEffectFolder
      .add("cursorDropSize", MIN_DROP_SIZE, MAX_DROP_SIZE, STEP_DROP_SIZE)
      .name("Size");
    cursorDropEffectFolder
      .add("cursorDropDepth", MIN_DROP_DEPTH, MAX_DROP_DEPTH, STEP_DROP_DEPTH)
      .name("Depth");

    const rainSystemFolder = gui.value.addFolder("Rain system");
    rainSystemFolder
      .add("rainIntensity", MIN_INTENSITY, MAX_INTENSITY, STEP_INTENSITY)
      .name("Intensity");
    rainSystemFolder
      .add("rainMode", {
        "One at a Time": RAIN_MODE.ONE_BY_ONE,
        "Multiple at Once": RAIN_MODE.ALL_AT_ONCE,
      })
      .name("Mode");
  };

  const reset = gui.value?.reset;

  const destroy = () => {
    if (gui.value) {
      gui.value.destroy();
      gui.value = null;
    }
  };

  return {
    gui,
    controls: readonly(controls),
    init,
    destroy,
    reset,
  };
});
