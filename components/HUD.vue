<script setup lang="ts">
import { HUD_ID } from "~/constants";
import { useHudStore } from "~/stores/useHudStore";

const hudStore = useHudStore();

const nuxtDevTools = ref<HTMLElement | null>(null);

onMounted(() => {
  nuxtDevTools.value = document.getElementById("nuxt-devtools-container");

  window.addEventListener("keydown", keydownListener);
});

onUnmounted(() => {
  window.removeEventListener("keydown", keydownListener);
});
function keydownListener(evt: KeyboardEvent) {
  if (evt.repeat) {
    return;
  }

  if (evt.ctrlKey && evt.key === "h") {
    hudStore.toggleHudVisibility();
    evt.preventDefault();

    nuxtDevTools.value ??= document.getElementById("nuxt-devtools-container");
    nuxtDevTools.value?.toggleAttribute("data-hidden");
  }
}
</script>

<template>
  <div v-if="hudStore.isHudVisible" :id="HUD_ID" class="m-5 max-h-full flex justify-between">
    <component
      :is="dynamicComponent"
      v-for="(dynamicComponent, index) in hudStore.components"
      :key="index"
    />

  </div>
</template>

<style>
#nuxt-devtools-container[data-hidden] {
  display: none;
}
</style>