<script setup lang="ts">
import * as THREE from "three";
import Stats from "three/addons/libs/stats.module";

import WaterSurface from "~/components/WaterSurface.vue";

const ratio = computed(() => window.innerWidth / window.innerHeight);
const devicePixelRatio = computed(() => window?.devicePixelRatio ?? 1);


const waterSurface = shallowRef();


</script>

<template>
  <TresCanvas shadows alpha window-size :pixel-ratio="devicePixelRatio" :tone-mapping="THREE.ACESFilmicToneMapping" :tone-mapping-exposure="0.5">
    <TresPerspectiveCamera
      :args="[90, ratio, 0.1, 1000]"
      :position="[0, 4, 0]"
      :look-at="[0, 0, 0]"
  />
    <WaterSurface ref="waterSurface" />
  </TresCanvas>
</template>

<style>

</style>