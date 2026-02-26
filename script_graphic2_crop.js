(() => {
  const mapShell = document.querySelector(".map-shell");
  if (!mapShell) return;

  const ROOT_STYLE = document.documentElement.style;
  // Locked from the latest manual adjustment so deploy renders identically.
  const LOCKED_BOTTOM_EDGE_OFFSET = -101;
  const MIN_SHELL_HEIGHT = 220;

  function applyLockedWindowHeight() {
    const measured = Math.round(mapShell.getBoundingClientRect().height);
    const baselineHeight = clampShellHeight(measured);
    ROOT_STYLE.setProperty("--graphic2-map-fixed-height", `${baselineHeight}px`);
    mapShell.style.height = `${clampShellHeight(baselineHeight + LOCKED_BOTTOM_EDGE_OFFSET)}px`;
  }

  function clampShellHeight(n) {
    if (!Number.isFinite(n)) return MIN_SHELL_HEIGHT;
    return Math.max(MIN_SHELL_HEIGHT, Math.round(n));
  }

  applyLockedWindowHeight();
})();
