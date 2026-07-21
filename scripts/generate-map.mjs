#!/usr/bin/env node
/**
 * generate-map.mjs — dependency-free displacement map generator for the
 * liquid glass effect. Writes a PNG (RGBA, 8-bit) usable as the feImage
 * displacement map, or prints a data URI.
 *
 * Map layout:
 *   R channel — horizontal displacement profile, varies only with x
 *   G channel — constant 128 (unused by the filter)
 *   B channel — vertical displacement profile, varies only with y
 *   A channel — constant 255
 *
 * feDisplacementMap displaces by `scale * (channel/255 - 0.5)`, so 128 means
 * "no displacement". Each axis profile is: flat at the extreme near the
 * edges (a few px), a steep climb over ~`edge` px, then an almost linear
 * ramp across the middle passing through 128 at the center. With a negative
 * scale this yields a magnifying lens with an equal-width refraction band
 * along the edges — the "curved glass rim".
 *
 * Usage:
 *   node scripts/generate-map.mjs out.png [options]
 *   node scripts/generate-map.mjs --stdout [options]   # print data URI
 *
 * Options:
 *   --width  <px>   map width            (default 256)
 *   --height <px>   map height           (default 64)
 *   --edge   <px>   edge climb width     (default 16)
 *   --min    <0-255> edge minimum value  (default 5)
 *   --max    <0-255> edge maximum value  (default 251)
 *   --gamma  <f>    edge climb steepness (default 3, higher = sharper)
 *   --mid    <0-1>  middle ramp slope    (default 0.62)
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------- PNG encoder

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  // compression 0, filter 0, interlace 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- axis profile

/**
 * 1D lens profile along one axis.
 * @param {number} i      pixel index along the axis
 * @param {number} length axis length in px
 * @param {object} opts   { edge, min, max, gamma, mid }
 * @returns {number} channel value 0-255 (128 = no displacement)
 */
function axisProfile(i, length, { edge, min, max, gamma, mid }) {
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

// --------------------------------------------------------------------- main

function parseArgs(argv) {
  const opts = { width: 256, height: 64, edge: 16, min: 5, max: 251, gamma: 3, mid: 0.62 };
  let out = null;
  let stdout = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--stdout') stdout = true;
    else if (a === '--width') opts.width = parseInt(argv[++i], 10);
    else if (a === '--height') opts.height = parseInt(argv[++i], 10);
    else if (a === '--edge') opts.edge = parseFloat(argv[++i]);
    else if (a === '--min') opts.min = parseInt(argv[++i], 10);
    else if (a === '--max') opts.max = parseInt(argv[++i], 10);
    else if (a === '--gamma') opts.gamma = parseFloat(argv[++i]);
    else if (a === '--mid') opts.mid = parseFloat(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/generate-map.mjs [out.png | --stdout] [--width N] [--height N] [--edge N] [--min N] [--max N] [--gamma F] [--mid F]');
      process.exit(0);
    } else if (!a.startsWith('--') && out === null) out = a;
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return { opts, out, stdout };
}

const { opts, out, stdout } = parseArgs(process.argv.slice(2));
const { width, height } = opts;
if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
  console.error('Invalid width/height');
  process.exit(1);
}

const rgba = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y++) {
  const b = axisProfile(y, height, opts);
  for (let x = 0; x < width; x++) {
    const o = (y * width + x) * 4;
    rgba[o] = axisProfile(x, width, opts); // R
    rgba[o + 1] = 128; // G (unused)
    rgba[o + 2] = b; // B
    rgba[o + 3] = 255; // A
  }
}

const png = encodePng(width, height, rgba);

if (stdout || !out) {
  process.stdout.write(`data:image/png;base64,${png.toString('base64')}\n`);
} else {
  writeFileSync(out, png);
  console.log(`Wrote ${out} (${width}x${height} RGBA, ${png.length} bytes)`);
}
