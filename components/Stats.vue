<script setup lang="ts">
import Stats from "three/addons/libs/stats.module";

const statsContainer = useTemplateRef<HTMLDivElement>("statsContainer");
const requestAnimationId = ref<number | null>(null);

onMounted(() => {
  if (!statsContainer.value) {
    return;
  }

  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.removeAttribute("style");
  stats.dom.classList.add("stats", "scale-125", "origin-top-left");

  statsContainer.value.appendChild(stats.dom);

  const loop = () => {
    stats.begin();
    stats.end();
    requestAnimationId.value = requestAnimationFrame(loop);
  };

  requestAnimationId.value = requestAnimationFrame(loop);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(requestAnimationId.value as number);
});
</script>

<template>
  <div ref="statsContainer" />
</template>

<style scoped>

</style>