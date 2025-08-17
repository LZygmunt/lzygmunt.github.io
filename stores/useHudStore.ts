import { defineStore } from "pinia";
import { type Component, ref } from "vue";

export const useHudStore = defineStore("hud", () => {
  const components = ref<Component[]>([]);
  const isHudVisible = ref(true);

  const toggleHudVisibility = () => {
    isHudVisible.value = !isHudVisible.value;
  };

  const addComponent = (component: Component) => {
    components.value.push(component);
  };

  return {
    components: readonly(components),
    isHudVisible: readonly(isHudVisible),
    addComponent,
    toggleHudVisibility,
  };
});
