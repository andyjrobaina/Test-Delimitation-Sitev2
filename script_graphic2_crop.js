(() => {
  const adjustBtn = document.getElementById("adjustGraphic2CropBtn");
  const panel = document.getElementById("graphic2CropPanel");
  const slider = document.getElementById("graphic2CropInput");
  const mapShell = document.querySelector(".map-shell");
  if (!mapShell) return;

  const STORAGE_KEY = "india-delimitation-graphic2-bottom-edge-offset-v3";
  const ROOT_STYLE = document.documentElement.style;
  const MIN_OFFSET = -360;
  const MAX_OFFSET = 360;
  const DEFAULT_OFFSET = 0;
  const MIN_SHELL_HEIGHT = 220;

  let isOpen = false;
  let baselineHeight = 0;
  let offset = DEFAULT_OFFSET;

  load();
  captureBaselineHeight();
  apply();
  if (adjustBtn && panel && slider) {
    setOpen(false);
    adjustBtn.addEventListener("click", () => {
      setOpen(!isOpen);
    });
    slider.addEventListener("input", () => {
      offset = clampOffset(Number(slider.value));
      apply();
      persist();
    });
  }

  function setOpen(next) {
    isOpen = Boolean(next);
    panel.hidden = !isOpen;
    adjustBtn.classList.toggle("is-selected", isOpen);
  }

  function apply() {
    if (slider) {
      slider.value = String(offset);
    }
    ROOT_STYLE.setProperty("--graphic2-map-fixed-height", `${baselineHeight}px`);
    mapShell.style.height = `${clampShellHeight(baselineHeight + offset)}px`;
  }

  function captureBaselineHeight() {
    const measured = Math.round(mapShell.getBoundingClientRect().height);
    baselineHeight = clampShellHeight(measured);
    ROOT_STYLE.setProperty("--graphic2-map-fixed-height", `${baselineHeight}px`);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null) return;
      offset = clampOffset(Number(raw));
    } catch (error) {
      console.warn("Could not load graphic 2 bottom edge offset.", error);
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, String(offset));
    } catch (error) {
      console.warn("Could not save graphic 2 bottom edge offset.", error);
    }
  }

  function clampOffset(n) {
    if (!Number.isFinite(n)) return DEFAULT_OFFSET;
    return Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, Math.round(n)));
  }

  function clampShellHeight(n) {
    if (!Number.isFinite(n)) return MIN_SHELL_HEIGHT;
    return Math.max(MIN_SHELL_HEIGHT, Math.round(n));
  }
})();
