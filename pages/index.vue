<script setup lang="ts">
import * as THREE from "three";

import ControlsGUI from "~/components/ControlsGUI.vue";
import HUD from "~/components/HUD.vue";
import Stats from "~/components/Stats.vue";
import WaterSurface from "~/components/WaterSurface.vue";
import { useHudStore } from "~/stores/useHudStore";

const ratio = computed(() => window.innerWidth / window.innerHeight);
const devicePixelRatio = computed(() => window?.devicePixelRatio ?? 1);

const hudStore = useHudStore();

onMounted(() => {
  hudStore.addComponent(Stats);
  hudStore.addComponent(ControlsGUI);
});
</script>

<template>
  <TresCanvas shadows alpha window-size :pixel-ratio="devicePixelRatio" :tone-mapping="THREE.ACESFilmicToneMapping" :tone-mapping-exposure="0.5">
    <TresPerspectiveCamera
      :args="[90, ratio, 0.1, 1000]"
      :position="[0, 4, 0]"
      :look-at="[0, 0, 0]"
  />
    <WaterSurface />
  </TresCanvas>
  <HUD />
</template>

<style>
#__nuxt canvas {
  z-index: -1;
}
</style>