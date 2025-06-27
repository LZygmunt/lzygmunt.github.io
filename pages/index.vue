<script setup lang="ts">
import * as THREE from 'three'

const ratio = computed(() => window.innerWidth / window.innerHeight)
const devicePixelRatio = computed(() => window?.devicePixelRatio ?? 1)

const waterSurface = shallowRef()
</script>

<template>
  <TresCanvas shadows alpha window-size :pixel-ratio="devicePixelRatio" :tone-mapping="THREE.ACESFilmicToneMapping" :tone-mapping-exposure="0.5">

    <TresPerspectiveCamera
    :args="[90, ratio, 0.1, 1000]"
    :position="[0,4, 0]"
    :look-at="[0, 0, 0]"
  />
    <WaterSurface ref="waterSurface" />

<!--      <TresAmbientLight :intensity="0.5" />-->
<!--  <TresDirectionalLight :args="[0xFFFFFF, 4.0]" :position="[0, 100, 100]" :intensity="1" castShadow />-->
  </TresCanvas>
</template>

<style>

</style>