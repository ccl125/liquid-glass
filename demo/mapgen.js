/**
 * mapgen.js — browser-side displacement map generator for the demo panel.
 * Same axis profile math as scripts/generate-map.mjs; renders into an
 * offscreen canvas and returns a data URI for hot-swapping the feImage href.
 *
 * Import-safe in Node: no DOM access happens at module top level, only
 * inside generateMapDataURI().
 */

export const MAP_WIDTH = 256;
export const MAP_HEIGHT = 64;
export const MAP_DEFAULTS = { edge: 16, gamma: 3 };

/**
 * 1D lens profile along one axis. See scripts/generate-map.mjs for details.
 * @param {number} i      pixel index along the axis
 * @param {number} length axis length in px
 * @param {object} opts   { edge, gamma } — min/max/mid fixed at the
 *                        original project's 5 / 251 / 0.62
 * @returns {number} channel value 0-255 (128 = no displacement)
 */
export function axisProfile(i, length, { edge, gamma, min = 5, max = 251, mid = 0.62 }) {
  const half = (length - 1) / 2;
  // Snap the center to "no displacement": with an even axis length the true
  // center falls between two pixels — both must read exactly 128.
  if (Math.abs(i - half) <= 0.5) return 128;
  const t = Math.abs(i - half) / half; // 0 at center, 1 at edge
  const e = Math.min(edge / half, 1); // climb zone as fraction of half-axis
  let f; // 0..1 normalized displacement magnitude
  if (t <= 1 - e) {
    f = mid * t; // middle: almost linear ramp
  } else {
    const s = (t - (1 - e)) / e; // 0..1 inside the climb zone
    const base = mid * (1 - e);
    f = base + (1 - base) * Math.pow(s, 1 / gamma); // steep climb
  }
  f = Math.min(f, 1); // flat cap at the extreme
  const sign = i < half ? -1 : 1;
  const amplitude = sign < 0 ? 128 - min : max - 128;
  return Math.round(128 + sign * f * amplitude);
}

/**
 * Render the displacement map (R = x profile, G = 128, B = y profile,
 * A = 255) into an offscreen canvas and return it as a PNG data URI.
 * 256x64 = 16384 pixels, cheap enough to run on every slider input.
 */
export function generateMapDataURI({ edge = MAP_DEFAULTS.edge, gamma = MAP_DEFAULTS.gamma } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(MAP_WIDTH, MAP_HEIGHT);
  const data = img.data;
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const b = axisProfile(y, MAP_HEIGHT, { edge, gamma });
    for (let x = 0; x < MAP_WIDTH; x++) {
      const o = (y * MAP_WIDTH + x) * 4;
      data[o] = axisProfile(x, MAP_WIDTH, { edge, gamma }); // R
      data[o + 1] = 128; // G (unused)
      data[o + 2] = b; // B
      data[o + 3] = 255; // A
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}
