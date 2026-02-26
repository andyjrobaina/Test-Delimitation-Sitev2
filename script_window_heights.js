(() => {
  const adjustBtn = document.getElementById("adjustWindowHeightBtn");
  const saveBtn = document.getElementById("saveWindowHeightBtn");
  const panel = document.getElementById("windowHeightPanel");
  const graphic1Input = document.getElementById("graphic1HeightInput");
  const graphic2Input = document.getElementById("graphic2HeightInput");
  const graphic1Shell = document.querySelector(".subject-map-shell");
  const graphic2Shell = document.querySelector(".map-shell");

  if (!graphic1Shell || !graphic2Shell) {
    return;
  }

  const STORAGE_KEY = "india-delimitation-window-heights-v1";
  const MIN_HEIGHT = 420;
  const MAX_HEIGHT = 1200;

  let isEditMode = false;
  let isLocked = false;
  let heights = {
    graphic1: clampHeight(Math.round(graphic1Shell.getBoundingClientRect().height)),
    graphic2: clampHeight(Math.round(graphic2Shell.getBoundingClientRect().height)),
  };

  loadWindowHeights();
  applyHeights();
  if (adjustBtn && saveBtn && panel && graphic1Input && graphic2Input) {
    syncInputs();
    setEditMode(false);

    adjustBtn.addEventListener("click", () => {
      if (isLocked) return;
      setEditMode(!isEditMode);
    });

    saveBtn.addEventListener("click", () => {
      if (isLocked || !isEditMode) return;
      isLocked = true;
      persistWindowHeights();
      setEditMode(false);
    });

    graphic1Input.addEventListener("input", () => {
      if (!isEditMode || isLocked) return;
      heights.graphic1 = clampHeight(Number(graphic1Input.value));
      applyHeights();
    });

    graphic2Input.addEventListener("input", () => {
      if (!isEditMode || isLocked) return;
      heights.graphic2 = clampHeight(Number(graphic2Input.value));
      applyHeights();
    });
  }

  function setEditMode(nextValue) {
    if (!adjustBtn || !saveBtn || !panel) return;
    if (isLocked) {
      isEditMode = false;
    } else {
      isEditMode = Boolean(nextValue);
    }

    panel.hidden = !isEditMode;
    adjustBtn.disabled = isLocked;
    saveBtn.disabled = isLocked || !isEditMode;
    adjustBtn.classList.toggle("is-selected", isEditMode);
    adjustBtn.textContent = isLocked ? "Height Saved" : "Adjust Window Height";
  }

  function clampHeight(value) {
    if (!Number.isFinite(value)) return MIN_HEIGHT;
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(value)));
  }

  function applyHeights() {
    graphic1Shell.style.height = `${heights.graphic1}px`;
    graphic2Shell.style.height = `${heights.graphic2}px`;
    syncInputs();
  }

  function syncInputs() {
    if (!graphic1Input || !graphic2Input) return;
    graphic1Input.value = String(clampHeight(heights.graphic1));
    graphic2Input.value = String(clampHeight(heights.graphic2));
  }

  function loadWindowHeights() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      heights.graphic1 = clampHeight(Number(parsed.graphic1));
      heights.graphic2 = clampHeight(Number(parsed.graphic2));
      isLocked = Boolean(parsed.locked);
    } catch (error) {
      console.warn("Could not load saved window heights.", error);
    }
  }

  function persistWindowHeights() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          graphic1: clampHeight(heights.graphic1),
          graphic2: clampHeight(heights.graphic2),
          locked: true,
        })
      );
    } catch (error) {
      console.warn("Could not save window heights.", error);
    }
  }
})();
