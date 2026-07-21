/**
 * panel.js — live controls for the liquid-glass demo.
 * Injects the filter, then wires sliders to updateLiquidGlassFilter (scales,
 * saturate) and to displacement-map regeneration (edge width, rim sharpness)
 * so every change applies in real time. Zero dependencies, plain DOM APIs.
 */
import { injectLiquidGlassFilter, updateLiquidGlassFilter } from '../src/core.js';
import { generateMapDataURI, MAP_DEFAULTS } from './mapgen.js';

// Defaults match the original project: scales -140/-124/-108, saturate 1.35,
// map edge 16px / gamma 3 (strength 124 = middle channel, dispersion 32 =
// total R↔B spread).
const DEFAULTS = {
  size: 62,
  strength: 124,
  dispersion: 32,
  saturate: 1.35,
  edge: MAP_DEFAULTS.edge,
  gamma: MAP_DEFAULTS.gamma,
};
const state = { ...DEFAULTS };

const FILTER_SELECTOR = '#liquid-glass';

const nav = document.querySelector('.pill-nav');
const inputs = {
  size: document.getElementById('ctl-size'),
  strength: document.getElementById('ctl-strength'),
  dispersion: document.getElementById('ctl-dispersion'),
  saturate: document.getElementById('ctl-saturate'),
  edge: document.getElementById('ctl-edge'),
  gamma: document.getElementById('ctl-gamma'),
};
const values = {
  size: document.getElementById('val-size'),
  strength: document.getElementById('val-strength'),
  dispersion: document.getElementById('val-dispersion'),
  saturate: document.getElementById('val-saturate'),
  edge: document.getElementById('val-edge'),
  gamma: document.getElementById('val-gamma'),
};

/** scales = [-(S + D/2), -S, -(S - D/2)] */
function scalesFrom(strength, dispersion) {
  return [-(strength + dispersion / 2), -strength, -(strength - dispersion / 2)];
}

/** Nav font size linked to its height: 40px → 13px, 96px → 19px (≈15.4px at 62px). */
function fontSizeFor(height) {
  return Math.round((13 + ((height - 40) / (96 - 40)) * 6) * 10) / 10;
}

function format(key, val) {
  if (key === 'size' || key === 'edge') return `${val}px`;
  if (key === 'saturate') return val.toFixed(2);
  if (key === 'gamma') return val.toFixed(1);
  return String(val);
}

/** Regenerate the displacement map and hot-swap the feImage href. */
function applyMap() {
  const feImage = document.querySelector(`${FILTER_SELECTOR} feImage`);
  if (feImage) {
    feImage.setAttribute('href', generateMapDataURI({ edge: state.edge, gamma: state.gamma }));
  }
}

function apply() {
  updateLiquidGlassFilter({
    scales: scalesFrom(state.strength, state.dispersion),
    saturate: state.saturate,
  });
  nav.style.height = `${state.size}px`;
  nav.style.fontSize = `${fontSizeFor(state.size)}px`;
  for (const key of Object.keys(values)) {
    values[key].textContent = format(key, state[key]);
  }
}

injectLiquidGlassFilter();

for (const [key, input] of Object.entries(inputs)) {
  input.addEventListener('input', () => {
    state[key] = key === 'saturate' || key === 'gamma' ? Number(input.value) : parseInt(input.value, 10);
    if (key === 'edge' || key === 'gamma') applyMap();
    apply();
  });
}

document.getElementById('ctl-reset').addEventListener('click', () => {
  Object.assign(state, DEFAULTS);
  for (const [key, input] of Object.entries(inputs)) {
    input.value = String(DEFAULTS[key]);
  }
  applyMap();
  apply();
});

apply();
