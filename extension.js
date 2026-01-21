let extensionAPIRef = null;

let h4FS, h4FW, h4FSt, h4FV;
let h5FS, h5FW, h5FSt, h5FV;
let h6FS, h6FW, h6FSt, h6FV;
let h4Tag, h5Tag, h6Tag;

let styleEl = null;
let mo = null;
let menuObserver = null;
let intersectionObserver = null;

let decorateTimer = null;
let observeTimer = null;
let updateStateTimer = null;

let cleanupIntervalId = null;
let hashChangeHandler = null;
let rightMouseDownHandler = null;

let observedElements = new WeakSet();

let baseCSS = "";
let dynamicCSS = "";
let lastDynamicCSS = "";

let forcedLevels = new Map();
let levelCache = new Map();
let queryCache = new Map();

let lastStyleText = "";

let lastContextMenuUid = null;
let lastContextMenuPoint = null;

let contextMenuButtonsEnabled = false;
let decorationInProgress = false;
let decorationPending = false;

let visibleBlocks = new Set();

// -------------------- Constants --------------------

const DEFAULT_PROP_KEY = "ah-level";
const SETTING_CONTEXT_MENU_BUTTONS = "context_menu_buttons";
const DEFAULT_CONTEXT_MENU_BUTTONS = false;

const SETTING_H4_TAG = "h4-tag";
const SETTING_H5_TAG = "h5-tag";
const SETTING_H6_TAG = "h6-tag";

const SETTING_H4_FS = "h4-fontSize";
const SETTING_H4_FW = "h4-fontWeight";
const SETTING_H4_FST = "h4-fontStyle";
const SETTING_H4_FV = "h4-fontVar";

const SETTING_H5_FS = "h5-fontSize";
const SETTING_H5_FW = "h5-fontWeight";
const SETTING_H5_FST = "h5-fontStyle";
const SETTING_H5_FV = "h5-fontVar";

const SETTING_H6_FS = "h6-fontSize";
const SETTING_H6_FW = "h6-fontWeight";
const SETTING_H6_FST = "h6-fontStyle";
const SETTING_H6_FV = "h6-fontVar";

const DEFAULTS = {
  h4Tag: "h4",
  h5Tag: "h5",
  h6Tag: "h6",
  h4FS: "16",
  h5FS: "14",
  h6FS: "12",
  h4FW: "600",
  h5FW: "600",
  h6FW: "600",
  h4FSt: "normal",
  h5FSt: "normal",
  h6FSt: "normal",
  h4FV: "normal",
  h5FV: "normal",
  h6FV: "normal",
};

const CACHE_TTL = 60000; // 1 minute
const MAX_CACHE_SIZE = 500;
const QUERY_CACHE_TTL = 5000; // 5 seconds
const MAX_QUERY_BATCH_SIZE = 25;
const DECORATION_DEBOUNCE = 500;
const CLEANUP_INTERVAL = 30000; // 30 seconds

// -------------------- Helpers --------------------

function getSetting(key, fallback) {
  const v = extensionAPIRef?.settings?.get(key);
  return v === undefined || v === null || v === "" ? fallback : v;
}

function normalizeBoolean(v, fallback) {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return fallback;
}

function getEvtValue(evt) {
  return evt?.target?.value ?? evt;
}

function normalizePxInt(v, fallback) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? String(n) : String(fallback);
}

function normalizeTag(input, fallback) {
  const raw = String(input ?? "").trim();
  const noHash = raw.startsWith("#") ? raw.slice(1) : raw;
  const safe = noHash.replace(/[^\w.\-\/]/g, "");
  return safe || fallback;
}

function cssAttrEscape(v) {
  return String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tagTokenRegexDetect(tag) {
  const t = escapeRegExp(tag);
  return new RegExp(`(^|\\s)#${t}(?=\\s|$|[.,;:!?)\\]]|\\^\\^)`);
}

function tagTokenRegexReplace(tag) {
  const t = escapeRegExp(tag);
  return new RegExp(`(^|\\s)#${t}(?=\\s|$|[.,;:!?)\\]]|\\^\\^)`, "g");
}

function toast(msg) {
  try {
    window.roamAlphaAPI?.ui?.showToast?.(msg);
  } catch (e) {
    // Silent failure
  }
}

function unwrapOuterHighlight(s) {
  let out = String(s ?? "");
  const trimmed = out.trim();
  if (trimmed.startsWith("^^") && trimmed.endsWith("^^") && trimmed.length >= 4) {
    out = trimmed.slice(2, -2).trim();
  }
  return out;
}

function removeLegacyTagAndOuterHighlight(s, tag) {
  let out = String(s ?? "");
  out = out.replace(tagTokenRegexReplace(tag), "$1").trim();
  out = unwrapOuterHighlight(out);
  return out.trim();
}

function syncLegacyTagStorage() {
  try {
    localStorage.setItem("augmented_headings:h4", h4Tag || DEFAULTS.h4Tag);
    localStorage.setItem("augmented_headings:h5", h5Tag || DEFAULTS.h5Tag);
    localStorage.setItem("augmented_headings:h6", h6Tag || DEFAULTS.h6Tag);
  } catch (e) {
    // ignore
  }
}

// -------------------- Cache Management --------------------

function cleanupCache(cache, maxSize, maxAge) {
  const now = Date.now();

  for (const [key, data] of cache.entries()) {
    if (data?.ts && now - data.ts > maxAge) {
      cache.delete(key);
    }
  }

  if (cache.size > maxSize) {
    const entries = Array.from(cache.entries())
      .filter(([, data]) => data?.ts)
      .sort((a, b) => a[1].ts - b[1].ts);

    const toRemove = entries.slice(0, cache.size - maxSize);
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

function schedulePeriodicCleanup() {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
  }
  cleanupIntervalId = setInterval(() => {
    cleanupCache(levelCache, MAX_CACHE_SIZE, CACHE_TTL);
    cleanupCache(queryCache, MAX_CACHE_SIZE, QUERY_CACHE_TTL);

    if (forcedLevels.size > MAX_CACHE_SIZE) {
      const entries = Array.from(forcedLevels.entries());
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => forcedLevels.delete(key));
    }
  }, CLEANUP_INTERVAL);
}

// -------------------- Roam API with Caching --------------------

async function getBlockString(uid) {
  const cacheKey = `str:${uid}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < QUERY_CACHE_TTL) {
    return cached.value;
  }

  try {
    const res = await window.roamAlphaAPI.pull("[:block/string]", [":block/uid", uid]);
    const value = res?.[":block/string"] ?? "";
    queryCache.set(cacheKey, { value, ts: Date.now() });
    return value;
  } catch (err) {
    return "";
  }
}

async function getBlockProps(uid) {
  const cacheKey = `props:${uid}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < QUERY_CACHE_TTL) {
    return cached.value;
  }

  try {
    const res = await window.roamAlphaAPI.pull("[:block/props]", [":block/uid", uid]);
    const props = res?.[":block/props"];
    const value = propsToObject(props);
    queryCache.set(cacheKey, { value, ts: Date.now() });
    return value;
  } catch (err) {
    return null;
  }
}

async function getBlockHeading(uid) {
  const cacheKey = `heading:${uid}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < QUERY_CACHE_TTL) {
    return cached.value;
  }

  try {
    const res = await window.roamAlphaAPI.pull("[:block/heading]", [":block/uid", uid]);
    const heading = res?.[":block/heading"];
    const value = Number.isFinite(heading) ? heading : null;
    queryCache.set(cacheKey, { value, ts: Date.now() });
    return value;
  } catch (err) {
    return null;
  }
}

function normalizePropKey(key) {
  return String(key ?? "").replace(/^:+/, "");
}

function propsToObject(props) {
  if (!props) return {};
  if (typeof props.toJS === "function") return props.toJS();
  if (typeof props.entries === "function") {
    try {
      return Object.fromEntries(props.entries());
    } catch {
      // fall through
    }
  }
  return typeof props === "object" ? props : {};
}

function getPropValue(props, key) {
  const obj = propsToObject(props);
  const base = normalizePropKey(key);
  for (const k of Object.keys(obj)) {
    if (normalizePropKey(k) === base) return obj[k];
  }
  return null;
}

function setPropValue(props, key, value) {
  const next = { ...propsToObject(props) };
  const base = normalizePropKey(key);

  for (const k of Object.keys(next)) {
    if (normalizePropKey(k) === base) delete next[k];
  }

  if (!value) return next;
  next[base] = value;
  return next;
}

// -------------------- DOM UID discovery --------------------

function findUidFromNode(node) {
  if (!node) return null;

  const direct =
    node.getAttribute?.("data-block-uid") ||
    node.dataset?.blockUid ||
    node.getAttribute?.("data-uid") ||
    node.dataset?.uid;

  if (direct) return direct;

  const parent = node.closest?.("[data-block-uid], [data-uid]");
  if (parent) {
    return parent.getAttribute("data-block-uid") || parent.getAttribute("data-uid");
  }

  const blockInput =
    node.matches?.("[id^='block-input-']") ? node : node.querySelector?.("[id^='block-input-']");

  if (blockInput?.id) {
    const parsed = parseUidFromBlockInputId(blockInput.id);
    if (parsed) return parsed;
  }

  const parentInput = node.closest?.("[id^='block-input-']");
  if (parentInput?.id) {
    const parsed = parseUidFromBlockInputId(parentInput.id);
    if (parsed) return parsed;
  }

  const blockContainer = node.closest?.(".roam-block-container, .rm-block, .rm-block-main");
  if (blockContainer) {
    const containerInput = blockContainer.querySelector?.("[id^='block-input-']");
    if (containerInput?.id) {
      const parsed = parseUidFromBlockInputId(containerInput.id);
      if (parsed) return parsed;
    }
  }

  return null;
}

function parseUidFromBlockInputId(id) {
  if (!id || !id.startsWith("block-input-")) return null;

  if (id.length >= 9) {
    const uid = id.slice(-9);
    if (/^[a-zA-Z0-9_-]{9}$/.test(uid)) {
      return uid;
    }
  }

  return null;
}

// -------------------- CSS --------------------

function ensureStyleEl() {
  if (styleEl && document.head.contains(styleEl)) return styleEl;

  const existing = Array.from(document.head.querySelectorAll("style#augmented-headings-css"));
  existing.forEach((el) => el.remove());

  styleEl = document.createElement("style");
  styleEl.id = "augmented-headings-css";
  document.head.appendChild(styleEl);
  return styleEl;
}

function updateStyleEl() {
  const el = ensureStyleEl();
  el.setAttribute("data-ah-mode", "per-uid");
  const next = `${baseCSS}\n${dynamicCSS}`;
  if (next === lastStyleText) return;
  lastStyleText = next;
  el.textContent = next;
}

function headingsCSS() {
  const t4 = cssAttrEscape(normalizeTag(h4Tag, DEFAULTS.h4Tag));
  const t5 = cssAttrEscape(normalizeTag(h5Tag, DEFAULTS.h5Tag));
  const t6 = cssAttrEscape(normalizeTag(h6Tag, DEFAULTS.h6Tag));

  const app = document.querySelector(".roam-body .roam-app") || document.querySelector(".roam-app");
  const comp = app ? window.getComputedStyle(app) : null;
  const rrSize = comp?.fontSize ?? "14px";
  const rrWeight = comp?.fontWeight ?? "400";
  const rrStyle = comp?.fontStyle ?? "normal";
  const rrVar = comp?.fontVariant ?? "normal";

  baseCSS = `
/* --- Augmented Headings CSS (per-UID mode) --- */
.bp3-menu .ah-heading-button[data-ah-active='true'] {
  background-color: rgba(72, 176, 240, 0.35) !important;
  border-color: rgba(72, 176, 240, 0.7) !important;
}

[data-tag^='${t4}'] { display: none !important; }
[data-tag^='${t4}'] + .rm-highlight { font-size: ${h4FS}px; font-weight: ${h4FW}; font-style: ${h4FSt}; font-variant: ${h4FV}; background: unset; }
[data-tag^='${t5}'] { display: none !important; }
[data-tag^='${t5}'] + .rm-highlight { font-size: ${h5FS}px; font-weight: ${h5FW}; font-style: ${h5FSt}; font-variant: ${h5FV}; background: unset; }
[data-tag^='${t6}'] { display: none !important; }
[data-tag^='${t6}'] + .rm-highlight { font-size: ${h6FS}px; font-weight: ${h6FW}; font-style: ${h6FSt}; font-variant: ${h6FV}; background: unset; }

[data-path-page-links*='${t4}'],
[data-path-page-links*='${t5}'],
[data-path-page-links*='${t6}'] {
  font-size: ${rrSize};
  font-weight: ${rrWeight};
  font-style: ${rrStyle};
  font-variant: ${rrVar};
}
`;

  lastStyleText = "";
  updateStyleEl();
  scheduleDecorate(200);
}

function clearDynamicCssNow() {
  dynamicCSS = "";
  lastDynamicCSS = "";
  lastStyleText = "";
  updateStyleEl();
}

// -------------------- Intersection Observer --------------------

function setupIntersectionObserver() {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }

  observedElements = new WeakSet();

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      let changed = false;

      for (const entry of entries) {
        const uid = findUidFromNode(entry.target);
        if (!uid) continue;

        if (entry.isIntersecting) {
          if (!visibleBlocks.has(uid)) {
            visibleBlocks.add(uid);
            changed = true;
          }
        } else {
          if (visibleBlocks.has(uid)) {
            visibleBlocks.delete(uid);
            changed = true;
          }
        }
      }

      if (changed) {
        scheduleDecorate(DECORATION_DEBOUNCE);
      }
    },
    {
      root: null,
      rootMargin: "100px",
      threshold: 0.01,
    }
  );

  observeBlockContainers();
}

function observeBlockContainers() {
  if (!intersectionObserver) return;

  const containers = document.querySelectorAll("[data-block-uid], [id^='block-input-']");
  containers.forEach((container) => {
    if (!observedElements.has(container)) {
      intersectionObserver.observe(container);
      observedElements.add(container);
    }
  });
}

function scheduleObserve(ms = 100) {
  if (observeTimer) clearTimeout(observeTimer);
  observeTimer = setTimeout(() => {
    observeBlockContainers();
  }, ms);
}

// -------------------- Optimized Decoration --------------------

async function decorateVisibleBlocks() {
  if (decorationInProgress) {
    decorationPending = true;
    return;
  }

  decorationInProgress = true;
  decorationPending = false;

  try {
    const propKey = DEFAULT_PROP_KEY;

    const cachedUids = Array.from(levelCache.keys());
    const visibleUids = Array.from(visibleBlocks);
    const forcedUids = Array.from(forcedLevels.keys());

    const allUids = [...new Set([...visibleUids, ...cachedUids, ...forcedUids])];

    if (!allUids.length) {
      return { uids: [], uidToLevel: new Map(), dynamicCSS };
    }

    const uidToLevel = new Map();
    const chunks = [];
    for (let i = 0; i < allUids.length; i += MAX_QUERY_BATCH_SIZE) {
      chunks.push(allUids.slice(i, i + MAX_QUERY_BATCH_SIZE));
    }

    for (const chunk of chunks) {
      await processBatch(chunk, uidToLevel, propKey);
    }

    const rules = [];
    for (const [uid, level] of uidToLevel.entries()) {
      const esc = cssAttrEscape(uid);
      const fs = level === "h4" ? h4FS : level === "h5" ? h5FS : h6FS;
      const fw = level === "h4" ? h4FW : level === "h5" ? h5FW : h6FW;
      const fst = level === "h4" ? h4FSt : level === "h5" ? h5FSt : h6FSt;
      const fv = level === "h4" ? h4FV : level === "h5" ? h5FV : h6FV;

      rules.push(
        `[id^='block-input-'][id$='-${esc}'] { font-size: ${fs}px; font-weight: ${fw}; font-style: ${fst}; font-variant: ${fv}; }`
      );

    }

    const newDynamicCSS = rules.length ? `\n/* --- Per-UID styling --- */\n${rules.join("\n")}\n` : "";

    if (newDynamicCSS !== lastDynamicCSS) {
      dynamicCSS = newDynamicCSS;
      lastDynamicCSS = newDynamicCSS;
      updateStyleEl();
    }

    return { uids: allUids, uidToLevel, dynamicCSS };
  } catch (err) {
    return { uids: [], uidToLevel: new Map(), dynamicCSS };
  } finally {
    decorationInProgress = false;

    if (decorationPending) {
      decorationPending = false;
      scheduleDecorate(0);
    }
  }
}

async function processBatch(uids, uidToLevel, propKey) {
  const uidList = uids.map((u) => `"${u}"`).join(" ");
  const q = `[:find (pull ?b [:block/uid :block/props :block/heading])
             :where [?b :block/uid ?uid]
                    [(contains? #{${uidList}} ?uid)]]`;

  let res = [];
  try {
    res = await window.roamAlphaAPI.q(q);
  } catch (err) {
    for (const uid of uids) {
      try {
        const props = await getBlockProps(uid);
        const heading = await getBlockHeading(uid);
        const str = await getBlockString(uid);
        res.push([{ uid, props, heading, string: str }]);
      } catch (e) {
        // ignore
      }
    }
  }

  const uidToProps = new Map();
  const uidToHeading = new Map();

  for (const row of res) {
    const b = row?.[0];
    const uid = b?.uid ?? b?.[":block/uid"];
    if (!uid) continue;
    uidToProps.set(uid, propsToObject(b?.[":block/props"] ?? b?.props));
    const heading = b?.heading ?? b?.[":block/heading"];
    uidToHeading.set(uid, Number.isFinite(heading) ? heading : null);
  }

  for (const uid of uids) {
    let props = uidToProps.get(uid);
    let heading = uidToHeading.get(uid);

    if (props === undefined || props === null) {
      props = await getBlockProps(uid);
    }
    if (heading === undefined) {
      heading = await getBlockHeading(uid);
    }

    let level = "";
    const isNativeHeading = heading && heading > 0;

    if (isNativeHeading) {
      forcedLevels.delete(uid);
      levelCache.delete(uid);

      const currentProp = props ? getPropValue(props, propKey) : null;
      if (currentProp) {
        const nextProps = setPropValue(props, propKey, "");
        try {
          await window.roamAlphaAPI.updateBlock({ block: { uid, props: nextProps } });
        } catch (err) {
          // ignore
        }
      }
    } else {
      if (forcedLevels.has(uid)) {
        level = String(forcedLevels.get(uid) ?? "").trim().toLowerCase();
      } else if (props === null) {
        const cached = levelCache.get(uid);
        level = cached ? cached.level : "";
      } else {
        level = String(getPropValue(props, propKey) ?? "").trim().toLowerCase();
      }

      if (!level) {
        const blockStr = await getBlockString(uid);
        const legacyLevel = detectLegacyLevel(blockStr);
        if (legacyLevel) level = legacyLevel;
      }
    }

    if (level === "h4" || level === "h5" || level === "h6") {
      uidToLevel.set(uid, level);
      levelCache.set(uid, { level, ts: Date.now() });
    } else {
      levelCache.delete(uid);
    }
  }
}

function scheduleDecorate(ms = DECORATION_DEBOUNCE) {
  if (decorateTimer) clearTimeout(decorateTimer);
  decorateTimer = setTimeout(() => decorateVisibleBlocks(), ms);
}

// -------------------- Legacy detection --------------------

function detectLegacyLevel(str) {
  const s = String(str ?? "");
  if (tagTokenRegexDetect(h4Tag).test(s)) return "h4";
  if (tagTokenRegexDetect(h5Tag).test(s)) return "h5";
  if (tagTokenRegexDetect(h6Tag).test(s)) return "h6";
  return null;
}

// -------------------- Context menu --------------------

async function updateContextMenuHeadingState(menuEl, uidOverride) {
  if (!menuEl) return;

  const uid = uidOverride || lastContextMenuUid || getContextMenuUid();
  if (!uid) return;

  if (updateStateTimer) {
    clearTimeout(updateStateTimer);
  }

  updateStateTimer = setTimeout(async () => {
    updateStateTimer = null;
    await performContextMenuStateUpdate(menuEl, uid);
  }, 10);
}

async function performContextMenuStateUpdate(menuEl, uid) {
  try {
    const [props, heading, blockStr] = await Promise.all([
      getBlockProps(uid),
      getBlockHeading(uid),
      getBlockString(uid),
    ]);

    let active = "";
    if (heading && heading > 0) {
      active = `h${heading}`;
    } else {
      const propLevel = String(getPropValue(props, DEFAULT_PROP_KEY) ?? "").trim().toLowerCase();
      if (propLevel === "h4" || propLevel === "h5" || propLevel === "h6") {
        active = propLevel;
      } else {
        const legacyLevel = detectLegacyLevel(blockStr);
        if (legacyLevel) {
          active = legacyLevel;
        }
      }
    }

    const h456Buttons = Array.from(menuEl.querySelectorAll("button[data-ah-h456='true']"));

    for (const btn of h456Buttons) {
      resetBlueprintButtonState(btn);
      const level = btn.getAttribute("data-ah-level");
      if (level && level === active) {
        btn.setAttribute("data-ah-active", "true");
      } else {
        btn.removeAttribute("data-ah-active");
      }
    }
  } catch (err) {
    // ignore
  }
}

function findHeadingButtonsRow(menuEl) {
  const rows = Array.from(menuEl.querySelectorAll(".flex-h-box"));
  return rows.find((row) => {
    const buttons = Array.from(row.querySelectorAll("button"));
    if (buttons.length < 3) return false;
    const text = buttons.map((b) => (b.textContent || "").replace(/\s+/g, "")).join(" ");
    return text.includes("H1") && text.includes("H2") && text.includes("H3");
  });
}

function resetBlueprintButtonState(btn) {
  if (!btn) return;

  btn.classList.remove(
    "bp3-active",
    "bp3-intent-primary",
    "bp3-intent-success",
    "bp3-intent-warning",
    "bp3-intent-danger",
    "bp3-selected"
  );

  btn.setAttribute("aria-pressed", "false");
}

function buildHeadingButton(level, template) {
  const button = template.cloneNode(true);
  resetBlueprintButtonState(button);
  button.setAttribute("data-ah-h456", "true");
  button.classList.add("ah-heading-button");
  button.setAttribute("data-ah-level", `h${level}`);
  button.innerHTML = `H<sub>${level}</sub>`;

  button.addEventListener("mousedown", (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
  });

  button.addEventListener("click", async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();

    const uid = lastContextMenuUid || getContextMenuUid(evt);
    if (!uid) {
      toast("Could not determine block UID");
      return;
    }

    try {
      await toggleHeading(uid, `h${level}`);

      const menuEl = button.closest(".bp3-menu");
      if (menuEl) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        updateContextMenuHeadingState(menuEl, uid);
      }
    } catch (err) {
      toast("Failed to toggle heading");
    }
  });

  return button;
}

function addHeadingButtons(menuEl) {
  if (!menuEl) return;

  const existing = menuEl.querySelectorAll("button[data-ah-h456='true']");
  if (existing.length >= 3) return;

  const row = findHeadingButtonsRow(menuEl);
  if (!row) return;

  const nativeButtons = Array.from(row.querySelectorAll("button")).slice(0, 3);
  const template =
    nativeButtons.find((b) => (b.style?.backgroundColor || "").includes("white")) ||
    nativeButtons[1] ||
    nativeButtons[0];

  if (!template) return;

  if (!lastContextMenuUid) {
    const uid = getContextMenuUid();
    if (uid) {
      lastContextMenuUid = uid;
    }
  }

  attachNativeHeadingListeners(row);

  const h4Btn = buildHeadingButton(4, template);
  const h5Btn = buildHeadingButton(5, template);
  const h6Btn = buildHeadingButton(6, template);

  row.appendChild(h4Btn);
  row.appendChild(h5Btn);
  row.appendChild(h6Btn);

  requestAnimationFrame(() => {
    updateContextMenuHeadingState(menuEl, lastContextMenuUid);
  });
}

function scanForContextMenus(node) {
  if (!(node instanceof HTMLElement)) return;

  const menus = [];
  if (node.matches(".bp3-menu")) {
    menus.push(node);
  }

  const foundMenus = node.querySelectorAll?.(".bp3-menu");
  if (foundMenus?.length) {
    menus.push(...Array.from(foundMenus));
  }

  menus.forEach((menu) => {
    addHeadingButtons(menu);
  });
}

function getContextMenuUid(evt) {
  if (lastContextMenuUid) {
    return lastContextMenuUid;
  }

  if (evt?.target) {
    const targetUid = findUidFromNode(evt.target);
    if (targetUid) {
      return targetUid;
    }
  }

  if (lastContextMenuPoint) {
    const pointEl = document.elementFromPoint(lastContextMenuPoint.x, lastContextMenuPoint.y);
    if (pointEl) {
      const pointUid = findUidFromNode(pointEl);
      if (pointUid) {
        return pointUid;
      }
    }
  }

  const focusedUid = window.roamAlphaAPI?.ui?.getFocusedBlock?.()?.["block-uid"];
  if (focusedUid) {
    return focusedUid;
  }

  const focusedBlock =
    document.querySelector(".rm-block--focused") ||
    document.querySelector(".rm-block--highlighted") ||
    document.querySelector(".block-highlight-blue");

  if (focusedBlock) {
    const focusedBlockUid = findUidFromNode(focusedBlock);
    if (focusedBlockUid) {
      return focusedBlockUid;
    }
  }

  return null;
}

function captureContextMenuUid(evt) {
  if (Number.isFinite(evt?.clientX) && Number.isFinite(evt?.clientY)) {
    lastContextMenuPoint = { x: evt.clientX, y: evt.clientY };

    const el = document.elementFromPoint(evt.clientX, evt.clientY);
    if (el) {
      const uid = findUidFromNode(el);
      if (uid) {
        lastContextMenuUid = uid;
        return;
      }
    }
  }

  const uid = getContextMenuUid(evt);
  if (uid) {
    lastContextMenuUid = uid;
  }
}

function setContextMenuButtonsEnabled(enabled) {
  const next = !!enabled;
  if (contextMenuButtonsEnabled === next) return;
  contextMenuButtonsEnabled = next;

  if (next) {
    document.addEventListener("contextmenu", captureContextMenuUid, true);

    rightMouseDownHandler = (evt) => {
      if (evt.button === 2) {
        captureContextMenuUid(evt);
      }
    };
    document.addEventListener("mousedown", rightMouseDownHandler, true);

    menuObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          scanForContextMenus(node);
        }
      }
    });
    menuObserver.observe(document.body, { childList: true, subtree: true });
    scanForContextMenus(document.body);
  } else {
    if (menuObserver) menuObserver.disconnect();
    menuObserver = null;

    document.removeEventListener("contextmenu", captureContextMenuUid, true);

    if (rightMouseDownHandler) {
      document.removeEventListener("mousedown", rightMouseDownHandler, true);
      rightMouseDownHandler = null;
    }
  }
}

function attachNativeHeadingListeners(row) {
  const buttons = Array.from(row.querySelectorAll("button"));
  const nativeButtons = buttons.slice(0, 3);

  for (const btn of nativeButtons) {
    if (btn.getAttribute("data-ah-native-hooked") === "true") continue;
    btn.setAttribute("data-ah-native-hooked", "true");

    btn.addEventListener("click", (evt) => {
      const uid = lastContextMenuUid || getContextMenuUid(evt);
      const menuEl = btn.closest(".bp3-menu");
      setTimeout(async () => {
        await clearAugmentedHeadingProp(uid);
        updateContextMenuHeadingState(menuEl, uid);
      }, 0);
    });
  }
}

async function clearAugmentedHeadingProp(uid) {
  if (!uid) return;
  const propKey = DEFAULT_PROP_KEY;
  const props = await getBlockProps(uid);
  if (!props) return;
  const current = getPropValue(props, propKey);
  if (!current) return;

  const nextProps = setPropValue(props, propKey, "");

  try {
    await window.roamAlphaAPI.updateBlock({ block: { uid, props: nextProps } });
    forcedLevels.delete(uid);
    levelCache.delete(uid);
    queryCache.delete(`props:${uid}`);
    scheduleDecorate(0);
  } catch (err) {
    // ignore
  }
}

// -------------------- Toggle heading --------------------

async function toggleHeading(uid, level) {
  if (!uid) {
    toast("No focused block found.");
    return;
  }

  const propKey = DEFAULT_PROP_KEY;

  try {
    queryCache.delete(`props:${uid}`);
    queryCache.delete(`heading:${uid}`);
    queryCache.delete(`str:${uid}`);

    const oldStr = await getBlockString(uid);
    let str = oldStr;

    const legacyLevel = detectLegacyLevel(str);
    if (legacyLevel) {
      const tag = legacyLevel === "h4" ? h4Tag : legacyLevel === "h5" ? h5Tag : h6Tag;
      str = removeLegacyTagAndOuterHighlight(str, tag);
    }

    const props = (await getBlockProps(uid)) || {};
    const heading = await getBlockHeading(uid);
    const current = String(getPropValue(props, propKey) ?? "").trim().toLowerCase();

    let next = "";
    if (current === level) {
      next = "";
    } else {
      next = level;
    }

    if (next === current && str === oldStr && (!heading || heading === 0)) {
      return;
    }

    const nextProps = setPropValue(props, propKey, next);
    const block = { uid, props: nextProps };

    // Always clear native heading when applying augmented heading
    if (next) {
      if (heading && heading > 0) {
        block.heading = 0;
      }
    }

    if (str !== oldStr) {
      block.string = str;
    }

    await window.roamAlphaAPI.updateBlock({ block });

    if (next) {
      forcedLevels.set(uid, next);
      levelCache.set(uid, { level: next, ts: Date.now() });
    } else {
      forcedLevels.delete(uid);
      levelCache.delete(uid);
    }

    queryCache.delete(`props:${uid}`);
    queryCache.delete(`heading:${uid}`);
    queryCache.delete(`str:${uid}`);

    scheduleDecorate(0);

    toast(next ? `Set heading to ${next.toUpperCase()}` : "Cleared heading");
  } catch (err) {
    toast("Failed to toggle heading. See console for details.");
  }
}

// -------------------- Extension lifecycle --------------------

export default {
  onload: ({ extensionAPI }) => {
    extensionAPIRef = extensionAPI;

    const config = {
      tabTitle: "Augmented Headings",
      settings: [
        {
          id: SETTING_CONTEXT_MENU_BUTTONS,
          name: "Add buttons to block context menu",
          description: "Adds H4/H5/H6 buttons next to the native H1/H2/H3 controls.",
          action: {
            type: "switch",
            onChange: (evt) => {
              const enabled = normalizeBoolean(evt?.target?.checked ?? evt, DEFAULT_CONTEXT_MENU_BUTTONS);
              setContextMenuButtonsEnabled(enabled);
            },
          },
        },
        {
          id: SETTING_H4_TAG,
          name: "Legacy H4 Tag",
          description: "Legacy tag token used in older versions.",
          action: {
            type: "input",
            placeholder: DEFAULTS.h4Tag,
            onChange: (evt) => {
              h4Tag = normalizeTag(getEvtValue(evt), DEFAULTS.h4Tag);
              headingsCSS();
              scheduleDecorate(200);
              syncLegacyTagStorage();
            },
          },
        },
        {
          id: SETTING_H5_TAG,
          name: "Legacy H5 Tag",
          description: "Legacy tag token used in older versions.",
          action: {
            type: "input",
            placeholder: DEFAULTS.h5Tag,
            onChange: (evt) => {
              h5Tag = normalizeTag(getEvtValue(evt), DEFAULTS.h5Tag);
              headingsCSS();
              scheduleDecorate(200);
              syncLegacyTagStorage();
            },
          },
        },
        {
          id: SETTING_H6_TAG,
          name: "Legacy H6 Tag",
          description: "Legacy tag token used in older versions.",
          action: {
            type: "input",
            placeholder: DEFAULTS.h6Tag,
            onChange: (evt) => {
              h6Tag = normalizeTag(getEvtValue(evt), DEFAULTS.h6Tag);
              headingsCSS();
              scheduleDecorate(200);
              syncLegacyTagStorage();
            },
          },
        },
        {
          id: SETTING_H4_FS,
          name: "H4 Font Size",
          description: "Font size for H4 headings (px).",
          action: {
            type: "input",
            placeholder: DEFAULTS.h4FS,
            onChange: (evt) => {
              h4FS = normalizePxInt(getEvtValue(evt), DEFAULTS.h4FS);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H4_FW,
          name: "H4 Font Weight",
          description: "Font weight for H4 headings.",
          action: {
            type: "select",
            items: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
            onChange: (evt) => {
              h4FW = String(getEvtValue(evt) ?? DEFAULTS.h4FW);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H4_FST,
          name: "H4 Font Style",
          description: "Font style for H4 headings.",
          action: {
            type: "select",
            items: ["normal", "italic", "oblique"],
            onChange: (evt) => {
              h4FSt = String(getEvtValue(evt) ?? DEFAULTS.h4FSt);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H4_FV,
          name: "H4 Font Variant",
          description: "Font variant for H4 headings.",
          action: {
            type: "select",
            items: ["normal", "small-caps", "all-small-caps", "unicase"],
            onChange: (evt) => {
              h4FV = String(getEvtValue(evt) ?? DEFAULTS.h4FV);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H5_FS,
          name: "H5 Font Size",
          description: "Font size for H5 headings (px).",
          action: {
            type: "input",
            placeholder: DEFAULTS.h5FS,
            onChange: (evt) => {
              h5FS = normalizePxInt(getEvtValue(evt), DEFAULTS.h5FS);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H5_FW,
          name: "H5 Font Weight",
          description: "Font weight for H5 headings.",
          action: {
            type: "select",
            items: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
            onChange: (evt) => {
              h5FW = String(getEvtValue(evt) ?? DEFAULTS.h5FW);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H5_FST,
          name: "H5 Font Style",
          description: "Font style for H5 headings.",
          action: {
            type: "select",
            items: ["normal", "italic", "oblique"],
            onChange: (evt) => {
              h5FSt = String(getEvtValue(evt) ?? DEFAULTS.h5FSt);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H5_FV,
          name: "H5 Font Variant",
          description: "Font variant for H5 headings.",
          action: {
            type: "select",
            items: ["normal", "small-caps", "all-small-caps", "unicase"],
            onChange: (evt) => {
              h5FV = String(getEvtValue(evt) ?? DEFAULTS.h5FV);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H6_FS,
          name: "H6 Font Size",
          description: "Font size for H6 headings (px).",
          action: {
            type: "input",
            placeholder: DEFAULTS.h6FS,
            onChange: (evt) => {
              h6FS = normalizePxInt(getEvtValue(evt), DEFAULTS.h6FS);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H6_FW,
          name: "H6 Font Weight",
          description: "Font weight for H6 headings.",
          action: {
            type: "select",
            items: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
            onChange: (evt) => {
              h6FW = String(getEvtValue(evt) ?? DEFAULTS.h6FW);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H6_FST,
          name: "H6 Font Style",
          description: "Font style for H6 headings.",
          action: {
            type: "select",
            items: ["normal", "italic", "oblique"],
            onChange: (evt) => {
              h6FSt = String(getEvtValue(evt) ?? DEFAULTS.h6FSt);
              headingsCSS();
            },
          },
        },
        {
          id: SETTING_H6_FV,
          name: "H6 Font Variant",
          description: "Font variant for H6 headings.",
          action: {
            type: "select",
            items: ["normal", "small-caps", "all-small-caps", "unicase"],
            onChange: (evt) => {
              h6FV = String(getEvtValue(evt) ?? DEFAULTS.h6FV);
              headingsCSS();
            },
          },
        },
      ],
    };

    extensionAPI.settings.panel.create(config);

    h4Tag = normalizeTag(getSetting(SETTING_H4_TAG, DEFAULTS.h4Tag), DEFAULTS.h4Tag);
    h5Tag = normalizeTag(getSetting(SETTING_H5_TAG, DEFAULTS.h5Tag), DEFAULTS.h5Tag);
    h6Tag = normalizeTag(getSetting(SETTING_H6_TAG, DEFAULTS.h6Tag), DEFAULTS.h6Tag);
    syncLegacyTagStorage();

    h4FS = normalizePxInt(getSetting(SETTING_H4_FS, DEFAULTS.h4FS), DEFAULTS.h4FS);
    h5FS = normalizePxInt(getSetting(SETTING_H5_FS, DEFAULTS.h5FS), DEFAULTS.h5FS);
    h6FS = normalizePxInt(getSetting(SETTING_H6_FS, DEFAULTS.h6FS), DEFAULTS.h6FS);

    h4FW = String(getSetting(SETTING_H4_FW, DEFAULTS.h4FW));
    h5FW = String(getSetting(SETTING_H5_FW, DEFAULTS.h5FW));
    h6FW = String(getSetting(SETTING_H6_FW, DEFAULTS.h6FW));

    h4FSt = String(getSetting(SETTING_H4_FST, DEFAULTS.h4FSt));
    h5FSt = String(getSetting(SETTING_H5_FST, DEFAULTS.h5FSt));
    h6FSt = String(getSetting(SETTING_H6_FST, DEFAULTS.h6FSt));

    h4FV = String(getSetting(SETTING_H4_FV, DEFAULTS.h4FV));
    h5FV = String(getSetting(SETTING_H5_FV, DEFAULTS.h5FV));
    h6FV = String(getSetting(SETTING_H6_FV, DEFAULTS.h6FV));

    setContextMenuButtonsEnabled(
      normalizeBoolean(getSetting(SETTING_CONTEXT_MENU_BUTTONS, DEFAULT_CONTEXT_MENU_BUTTONS), DEFAULT_CONTEXT_MENU_BUTTONS)
    );

    clearDynamicCssNow();
    headingsCSS();
    setupIntersectionObserver();
    schedulePeriodicCleanup();

    extensionAPI.ui.commandPalette.addCommand({
      label: "Toggle Heading - H4",
      callback: () => {
        const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
        toggleHeading(uid, "h4");
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Toggle Heading - H5",
      callback: () => {
        const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
        toggleHeading(uid, "h5");
      },
    });
    extensionAPI.ui.commandPalette.addCommand({
      label: "Toggle Heading - H6",
      callback: () => {
        const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
        toggleHeading(uid, "h6");
      },
    });

    window.roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Toggle Heading - H4",
      callback: (e) => toggleHeading(e["block-uid"], "h4"),
    });
    window.roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Toggle Heading - H5",
      callback: (e) => toggleHeading(e["block-uid"], "h5"),
    });
    window.roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Toggle Heading - H6",
      callback: (e) => toggleHeading(e["block-uid"], "h6"),
    });

    const root = document.querySelector(".roam-body") || document.querySelector(".roam-app") || document.body;

    mo = new MutationObserver((mutations) => {
      let needsObserve = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (
              node.hasAttribute?.("data-block-uid") ||
              node.querySelector?.("[data-block-uid]") ||
              node.id?.startsWith?.("block-input-") ||
              node.querySelector?.("[id^='block-input-']")
            ) {
              needsObserve = true;
              break;
            }
          }
        }
        if (needsObserve) break;
      }
      if (needsObserve) {
        scheduleObserve(200);
      }
    });

    mo.observe(root, { childList: true, subtree: true });

    scheduleDecorate(200);

    hashChangeHandler = () => {
      lastStyleText = "";
      visibleBlocks.clear();
      forcedLevels.clear();
      levelCache.clear();
      clearDynamicCssNow();

      setupIntersectionObserver();
      scheduleDecorate(200);
    };
    window.addEventListener("hashchange", hashChangeHandler);

    window.__augmentedHeadingsDebug = {
      findUidFromNode,
      logUidFromSelection: () => {
        const sel = window.getSelection?.();
        const node = sel?.anchorNode;
        const el =
          (node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement) ||
          document.activeElement ||
          document.querySelector(".rm-block--focused");
        const uid = findUidFromNode(el);
        console.log({ uid, el });
        return uid;
      },
      logUidFromClosestBlockContainer: () => {
        const sel = window.getSelection?.();
        const node = sel?.anchorNode;
        const el =
          (node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement) ||
          document.activeElement ||
          document.querySelector(".rm-block--focused");
        const container = el?.closest?.("[data-block-uid], .roam-block-container");
        const uid = findUidFromNode(container || el);
        console.log({ uid, el, container });
        return uid;
      },
      decorateVisibleBlocks,
      updateStyleEl,
      scheduleDecorate,
      parseUidFromBlockInputId,
      getBlockProps,
      getPropValue,
      caches: { levelCache, queryCache, forcedLevels },
      visibleBlocks,
    };
  },

  onunload: () => {
    if (styleEl && document.head.contains(styleEl)) {
      document.head.removeChild(styleEl);
    }
    styleEl = null;

    if (mo) mo.disconnect();
    mo = null;

    if (intersectionObserver) intersectionObserver.disconnect();
    intersectionObserver = null;

    if (decorateTimer) clearTimeout(decorateTimer);
    decorateTimer = null;

    if (observeTimer) clearTimeout(observeTimer);
    observeTimer = null;

    if (updateStateTimer) clearTimeout(updateStateTimer);
    updateStateTimer = null;

    if (cleanupIntervalId) clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;

    if (hashChangeHandler) {
      window.removeEventListener("hashchange", hashChangeHandler);
      hashChangeHandler = null;
    }

    observedElements = new WeakSet();
    lastStyleText = "";
    visibleBlocks.clear();
    forcedLevels.clear();
    levelCache.clear();
    queryCache.clear();

    setContextMenuButtonsEnabled(false);

    try {
      window.roamAlphaAPI.ui.blockContextMenu.removeCommand({ label: "Toggle Heading - H4" });
      window.roamAlphaAPI.ui.blockContextMenu.removeCommand({ label: "Toggle Heading - H5" });
      window.roamAlphaAPI.ui.blockContextMenu.removeCommand({ label: "Toggle Heading - H6" });
    } catch (e) {
      // ignore
    }
  },
};
