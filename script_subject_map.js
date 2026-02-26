(() => {
  const svg = d3.select("#subjectMap");
  const mapWrap = document.querySelector(".subject-map-wrap");
  const tooltipEl = document.getElementById("subjectTooltip");
  const subjectControls = document.querySelector(".subject-controls");
  const filterBtn = document.getElementById("subjectFilterBtn");
  if (svg.empty() || !filterBtn) return;

  const GEOJSON_URL = "indiaTelengana.geojson";
  const VIEWBOX_WIDTH = 1600;
  const VIEWBOX_HEIGHT = 960;
  const MAP_ZOOM_FACTOR = 0.88;
  const FADED_OPACITY = 0.35;
  const BASE_FILL_COLOR = "#041f63";
  const HIGHLIGHT_FILL_COLOR = "#52B5AB";

  const CUSTOM_SEATS = {
    before: {
      "Andaman and Nicobar Islands": "1",
      "Andhra Pradesh": "25",
      "Arunachal Pradesh": "2",
      Assam: "14",
      Bihar: "40",
      Chandigarh: "1",
      Chhattisgarh: "11",
      "Dadra and Nagar Haveli and Daman and Diu": "2",
      Delhi: "7",
      Goa: "2",
      Gujarat: "26",
      Haryana: "10",
      "Himachal Pradesh": "4",
      "Jammu and Kashmir": "5",
      Jharkhand: "14",
      Karnataka: "28",
      Kerala: "20",
      Ladakh: "1",
      Lakshadweep: "1",
      "Madhya Pradesh": "29",
      Maharashtra: "48",
      Manipur: "2",
      Meghalaya: "2",
      Mizoram: "1",
      Nagaland: "1",
      Odisha: "21",
      Puducherry: "1",
      Punjab: "13",
      Rajasthan: "25",
      Sikkim: "1",
      "Tamil Nadu": "39",
      Telangana: "17",
      Tripura: "2",
      "Uttar Pradesh": "80",
      Uttarakhand: "5",
      "West Bengal": "42",
    },
    after: {
      "Andaman and Nicobar Islands": "1",
      "Andhra Pradesh": "20",
      "Arunachal Pradesh": "2",
      Assam: "14",
      Bihar: "49",
      Chandigarh: "1",
      Chhattisgarh: "12",
      "Dadra and Nagar Haveli and Daman and Diu": "2",
      Delhi: "7",
      Goa: "2",
      Gujarat: "28",
      Haryana: "12",
      "Himachal Pradesh": "3",
      "Jammu and Kashmir": "5",
      Jharkhand: "15",
      Karnataka: "26",
      Kerala: "14",
      Ladakh: "1",
      Lakshadweep: "1",
      "Madhya Pradesh": "33",
      Maharashtra: "48",
      Manipur: "2",
      Meghalaya: "2",
      Mizoram: "1",
      Nagaland: "1",
      Odisha: "18",
      Puducherry: "1",
      Punjab: "12",
      Rajasthan: "31",
      Sikkim: "1",
      "Tamil Nadu": "29",
      Telangana: "14",
      Tripura: "2",
      "Uttar Pradesh": "91",
      Uttarakhand: "4",
      "West Bengal": "38",
    },
  };

  const STATE_NAME_ALIASES = {
    "nct of delhi": "delhi",
    "delhi nct": "delhi",
    orissa: "odisha",
    "orissa state": "odisha",
    pondicherry: "puducherry",
    uttaranchal: "uttarakhand",
    "himachal pradesh state": "himachal pradesh",
    himachalpradesh: "himachal pradesh",
    "telangana state": "telangana",
    telegana: "telangana",
    teleganna: "telangana",
    telengana: "telangana",
    telenganna: "telangana",
    maharastra: "maharashtra",
    "dadra and nagar haveli": "dadra and nagar haveli and daman and diu",
    "daman and diu": "dadra and nagar haveli and daman and diu",
    "andaman and nicobar island": "andaman and nicobar islands",
  };

  const ALWAYS_VISIBLE_STATES = new Set(["assam", "maharashtra"]);

  const projection = d3.geoMercator();
  const path = d3.geoPath(projection);

  let statePaths = null;
  let subjectStates = new Set();
  let filterOn = false;

  init().catch((error) => {
    console.error("Could not render subject map.", error);
  });

  async function init() {
    let geojson = window.INDIA_GEOJSON || null;
    if (!geojson) {
      geojson = await d3.json(GEOJSON_URL);
    }

    if (!geojson || !Array.isArray(geojson.features)) {
      throw new Error("Invalid GeoJSON response");
    }

    const rawStateFeatures = geojson.features
      .map((feature) => ({ ...feature, stateName: getStateName(feature) }))
      .filter((feature) => feature.stateName);

    const stateFeatures = selectOneFeaturePerState(rawStateFeatures).sort((a, b) =>
      a.stateName.localeCompare(b.stateName)
    );

    if (!stateFeatures.length) {
      throw new Error("No states were found in map data");
    }

    subjectStates = buildSubjectStatesSet(stateFeatures);
    fitProjection(stateFeatures);
    render(stateFeatures);
    wireControlsAlignment();

    filterBtn.addEventListener("click", () => {
      filterOn = !filterOn;
      applySubjectFilter();
    });

    applySubjectFilter();
  }

  function fitProjection(features) {
    const collection = { type: "FeatureCollection", features };
    svg.attr("viewBox", `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
    svg.attr("preserveAspectRatio", "xMidYMid meet");

    projection.fitSize([VIEWBOX_WIDTH, VIEWBOX_HEIGHT], collection);
    projection.scale(projection.scale() * MAP_ZOOM_FACTOR);

    const [[x0, y0], [x1, y1]] = path.bounds(collection);
    const [tx, ty] = projection.translate();
    projection.translate([
      tx + (VIEWBOX_WIDTH / 2 - (x0 + x1) / 2),
      ty + (VIEWBOX_HEIGHT / 2 - (y0 + y1) / 2),
    ]);
  }

  function render(features) {
    statePaths = svg
      .append("g")
      .attr("class", "subject-states")
      .selectAll("path")
      .data(features)
      .enter()
      .append("path")
      .attr("class", "subject-state")
      .attr("d", path)
      .on("mouseenter", (event, d) => showSubjectTooltip(event, d.stateName))
      .on("mousemove", (event, d) => showSubjectTooltip(event, d.stateName))
      .on("mouseleave", hideSubjectTooltip);
  }

  function applySubjectFilter() {
    if (!statePaths) return;

    filterBtn.classList.toggle("is-selected", filterOn);
    statePaths
      .attr("fill", (d) => {
        if (!filterOn) return BASE_FILL_COLOR;
        return isSubjectState(d.stateName) ? HIGHLIGHT_FILL_COLOR : BASE_FILL_COLOR;
      })
      .attr("opacity", (d) => {
        if (!filterOn) return 1;
        return isSubjectState(d.stateName) ? 1 : FADED_OPACITY;
      });
  }

  function isSubjectState(stateName) {
    const simplified = simplifyStateName(normalizeStateKey(stateName));
    return subjectStates.has(simplified);
  }

  function buildSubjectStatesSet(features) {
    const subject = new Set();
    const beforeScenario = parseCustomScenario(CUSTOM_SEATS.before);
    const afterScenario = parseCustomScenario(CUSTOM_SEATS.after);

    for (const feature of features) {
      const stateName = feature.stateName;
      const beforeValue = getScenarioValueForState(stateName, beforeScenario);
      const afterValue = getScenarioValueForState(stateName, afterScenario);
      if (!Number.isFinite(beforeValue) || !Number.isFinite(afterValue)) continue;

      if (afterValue - beforeValue !== 0) {
        subject.add(simplifyStateName(normalizeStateKey(stateName)));
      }
    }

    for (const stateName of ALWAYS_VISIBLE_STATES) {
      subject.add(stateName);
    }

    return subject;
  }

  function wireControlsAlignment() {
    const mainControls = document.querySelector(".controls");
    if (!mainControls || !subjectControls) return;

    const sync = () => {
      const baseTransform = mainControls.style.transform || "";
      subjectControls.style.transform = baseTransform;
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(mainControls, {
      attributes: true,
      attributeFilter: ["style"],
    });

    window.addEventListener("resize", () => {
      window.requestAnimationFrame(sync);
    });
  }

  function showSubjectTooltip(event, stateName) {
    if (!tooltipEl || !mapWrap) return;

    tooltipEl.textContent = stateName;
    tooltipEl.style.opacity = "1";

    const mapRect = mapWrap.getBoundingClientRect();
    const x = event.clientX - mapRect.left;
    const y = event.clientY - mapRect.top;
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  }

  function hideSubjectTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.opacity = "0";
  }

  function parseCustomScenario(rawScenario) {
    const parsed = new Map();

    for (const [stateName, rawValue] of Object.entries(rawScenario)) {
      const parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) continue;

      const canonical = normalizeStateKey(stateName);
      const simplified = simplifyStateName(canonical);
      parsed.set(canonical, parsedValue);
      parsed.set(simplified, parsedValue);
    }

    return parsed;
  }

  function getScenarioValueForState(stateName, parsedScenario) {
    const canonicalState = normalizeStateKey(stateName);
    const simplifiedState = simplifyStateName(canonicalState);

    if (parsedScenario.has(canonicalState)) {
      return parsedScenario.get(canonicalState);
    }
    if (parsedScenario.has(simplifiedState)) {
      return parsedScenario.get(simplifiedState);
    }

    const alias = STATE_NAME_ALIASES[canonicalState];
    if (alias && parsedScenario.has(alias)) {
      return parsedScenario.get(alias);
    }
    const aliasFromSimplified = STATE_NAME_ALIASES[simplifiedState];
    if (aliasFromSimplified && parsedScenario.has(aliasFromSimplified)) {
      return parsedScenario.get(aliasFromSimplified);
    }

    for (const [candidateKey, candidateValue] of parsedScenario.entries()) {
      const simplifiedCandidate = simplifyStateName(candidateKey);
      if (
        simplifiedCandidate &&
        simplifiedState &&
        (simplifiedCandidate === simplifiedState ||
          simplifiedCandidate.includes(simplifiedState) ||
          simplifiedState.includes(simplifiedCandidate))
      ) {
        return candidateValue;
      }
    }

    return null;
  }

  function normalizeStateKey(name) {
    const canonical = canonicalizeStateName(name);
    return STATE_NAME_ALIASES[canonical] || canonical;
  }

  function getStateName(feature) {
    const keys = ["st_nm", "ST_NM", "name", "NAME_1", "state", "STATE"];
    for (const key of keys) {
      if (feature.properties && feature.properties[key]) {
        return String(feature.properties[key]).trim();
      }
    }
    return "";
  }

  function selectOneFeaturePerState(features) {
    const groupedByState = new Map();

    for (const feature of features) {
      const stateName = feature.stateName;
      if (!stateName) continue;
      const stateKey = normalizeStateKey(stateName);
      if (!groupedByState.has(stateKey)) {
        groupedByState.set(stateKey, []);
      }
      groupedByState.get(stateKey).push(feature);
    }

    const selected = [];
    for (const [stateKey, group] of groupedByState.entries()) {
      const stateLevel = group.filter((feature) => !hasDistrictProperty(feature));
      const candidates = stateLevel.length ? stateLevel : group;

      let bestFeature = candidates[0];
      let bestScore = getFeatureArea(bestFeature) + getStateIdMatchScore(bestFeature, stateKey);

      for (let i = 1; i < candidates.length; i += 1) {
        const feature = candidates[i];
        const score = getFeatureArea(feature) + getStateIdMatchScore(feature, stateKey);
        if (score > bestScore) {
          bestFeature = feature;
          bestScore = score;
        }
      }

      selected.push(bestFeature);
    }

    return selected;
  }

  function hasDistrictProperty(feature) {
    const properties = feature && feature.properties ? feature.properties : {};
    return Boolean(properties.district || properties.DISTRICT || properties.dt_code || properties.DT_CODE);
  }

  function getFeatureArea(feature) {
    try {
      const area = d3.geoArea(feature);
      return Number.isFinite(area) ? area : 0;
    } catch (error) {
      return 0;
    }
  }

  function getStateIdMatchScore(feature, stateKey) {
    const idKey = normalizeStateKey(feature && feature.id ? feature.id : "");
    return idKey && idKey === stateKey ? 0.5 : 0;
  }

  function canonicalizeStateName(name) {
    return String(name)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function simplifyStateName(name) {
    return canonicalizeStateName(name)
      .replace(/\b(state|union territory|territory|ut|nct)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
})();
