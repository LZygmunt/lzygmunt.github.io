<script setup lang="ts">
import { useControlsGUIStore } from "~/stores/useControlsGUIStore";

const controlsGUIElement = useTemplateRef<HTMLDivElement>("controlsGUIElement");
const controlsGUIStore = useControlsGUIStore();

onMounted(async () => {
  if (!controlsGUIElement.value) {
    return;
  }

  await controlsGUIStore.init({ title: "Settings", container: controlsGUIElement.value });
});
</script>

<template>
  <div ref="controlsGUIElement"/>
</template>

<style scoped>

</style>