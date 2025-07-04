const RESIZE_DEBOUNCE_MS = 100; // Debounce delay for resize (ms)

export function useWindowResize(cb: () => void, debounce = RESIZE_DEBOUNCE_MS) {
  let resizeTimeout: NodeJS.Timeout;

  const onResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(cb, debounce);
  };

  onMounted(() => {
    window.addEventListener("resize", onResize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", onResize);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
  });
}
