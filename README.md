# liquid-glass

Apple-style **liquid glass** for the web: a real refraction lens for `backdrop-filter`, not another frosted blur. Pure ESM JavaScript, zero dependencies, no build step. Vanilla core + optional React wrapper.

![license](https://img.shields.io/badge/license-MIT-blue.svg)

## What it is

Most "glass" UI is `backdrop-filter: blur(...)` — a frosted, milky panel. Liquid glass is different: an SVG displacement-map filter refracts the content behind the element like a curved glass lens. The backdrop stays sharp but bends — magnified through the body of the glass and warped hardest along an equal-width band at the edges, simulating a rounded rim. A tiny per-channel offset adds chromatic dispersion (rainbow fringe), like light through a prism.

## How it works

1. `backdrop-filter: url("#liquid-glass")` lets an SVG filter process the element's **backdrop** (whatever is painted behind it).
2. The core primitive is `feDisplacementMap`. The displacement map's **R channel controls horizontal** displacement, **B channel controls vertical**:

   ```
   displacement = scale × (channelValue / 255 − 0.5)
   ```

   so `128` = no displacement, values below 128 push one way, above 128 the other.
3. The map is a **separable lens profile** (256×64 RGBA): R varies only with x, B varies only with y, G = 128 (unused), A = 255. Each axis profile:

   ```
   value
    251 |                                   ______
        |                              ____/
        |                           __/
    128 | --------­----------------·----------------­--------   center: no displacement
        |                    __/
        |               ____/
      5 | _____________/
        +------------------------------------------------ position
          ^edge^  steep climb (~16px)   ^edge^
   ```

   A flat extreme cap at the very edge, a steep climb over ~16px, then an almost linear ramp through 128 at the center. Combined with a **negative scale** (−140) this produces a magnifying lens whose refraction is concentrated in an equal-width band along the edges — the "curved glass rim" bending light.
4. **Chromatic dispersion**: the same map is applied 3 times with slightly different scales (`-140 / -124 / -108`). Each result is reduced to a single RGB channel via `feColorMatrix`, then the three are recombined with `feBlend mode="screen"`. The slight displacement difference between channels is the rainbow fringe.
5. The filter region is deliberately oversized — `x="-20%" y="-80%" width="140%" height="260%"` — so edge refraction can spill outside the element's box.
6. **Graceful degradation**: browsers without `backdrop-filter: url()` support (Safari, Firefox) fall back to `blur(12px) saturate(1.5)` frosted glass via an `@supports` query. Chromium gets the pure refraction lens — no blur at all.
7. On the CSS side, inset white highlights fake reflections on the curved edge, and a soft outer shadow makes the element float.

## Install

```bash
npm install github:ccl125/liquid-glass
```

> The package name `liquid-glass` may be taken on the npm registry — if you publish, you may need to rename it in `package.json`.

Or just copy two files into your project — there are no dependencies:

- `src/core.js` (+ `src/map.js`, which it imports)
- `src/liquid-glass.css`

## Usage

### Vanilla

```js
import { injectLiquidGlassFilter } from 'liquid-glass';
import 'liquid-glass/css'; // or a plain <link rel="stylesheet">

injectLiquidGlassFilter(); // call once, e.g. on app start
```

```html
<nav class="liquid-glass">…</nav>
```

Add your own `border-radius`, padding, layout — the class only handles the glass.

### React

```jsx
import { LiquidGlass } from 'liquid-glass/react';
import 'liquid-glass/css';

function Nav() {
  return (
    <LiquidGlass className="my-nav" style={{ borderRadius: 9999 }}>
      Home · Docs · GitHub
    </LiquidGlass>
  );
}
```

Props: `children`, `className`, `style`, `filterId`, `scales`, `saturate`. The filter is injected on mount (idempotent, so multiple `<LiquidGlass>` instances are fine).

### Overriding the CSS

`.liquid-glass` ships with a translucent white tint `rgba(255,255,255,0.15)` and generic highlights/shadows. Override anything in your own stylesheet (it must stay translucent or the backdrop won't show through):

```css
.my-nav {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 9999px;
}
```

## Customization

`injectLiquidGlassFilter(options)` / `<LiquidGlass {...options}>`:

| option | default | meaning |
| --- | --- | --- |
| `id` | `'liquid-glass'` | Filter id. Must match the `url("#…")` in your CSS. |
| `scales` | `[-140, -124, -108]` | Displacement scales for the R/G/B passes. Larger absolute values = stronger refraction; the spread between them = dispersion (rainbow) strength. |
| `saturate` | `1.35` | Final saturation boost, baked into the filter. |

### Live updates

`updateLiquidGlassFilter(options)` patches an already-injected filter in place — only the options you pass are touched. Returns `false` if no filter with that id exists, `true` on success. Handy for sliders and settings panels (see `demo/panel.js`):

```js
import { updateLiquidGlassFilter } from 'liquid-glass';

slider.addEventListener('input', (e) => {
  const s = Number(e.target.value); // base strength
  updateLiquidGlassFilter({ scales: [-(s + 16), -s, -(s - 16)] });
});
```

### Regenerating the displacement map

`src/map.js` ships a ready-made map as a data URI. To generate your own (dependency-free Node script, hand-rolled PNG encoder):

```bash
node scripts/generate-map.mjs my-map.png                      # write a PNG
node scripts/generate-map.mjs --stdout                        # print a data URI
node scripts/generate-map.mjs m.png --edge 24 --gamma 4 --mid 0.5
```

Options: `--width` (256), `--height` (64), `--edge` edge climb width in px (16), `--min`/`--max` edge extremes (5/251), `--gamma` climb steepness (3), `--mid` middle ramp slope (0.62).

## Browser support

| Browser | Support |
| --- | --- |
| Chrome / Edge | ✅ Full effect (refraction + dispersion) |
| Firefox | ⚠️ Frosted-glass fallback (`blur`) |
| Safari | ⚠️ Frosted-glass fallback (`-webkit-backdrop-filter: blur`) |

## Known caveats

- `backdrop-filter: url()` only works in Chromium — the fallback is intentional and automatic.
- The oversized filter region means edge refraction can visibly spill outside the element against very empty/uniform backgrounds.
- The effect is GPU-intensive on large elements; prefer it for navs, pills, cards — not full-screen overlays.

## Demo

```bash
cd liquid-glass
python3 -m http.server     # then open http://localhost:8000/demo/
# or: npx serve .          # then open /demo/
```

Opening `demo/index.html` directly via `file://` won't work — browsers block ES module imports over `file://` (CORS). Open it in Chrome/Edge for the full effect.

---

## 中文说明

**liquid-glass** 是一个"液态玻璃"效果库：不是常见的模糊磨砂，而是用 SVG 位移贴图滤镜（`feDisplacementMap`）让元素背后的内容发生真实折射，像弧形玻璃透镜一样弯折光线，并带彩虹色散边缘。零依赖、纯 ESM、无构建步骤，包含框架无关核心和 React 包装。

**原理要点**

- `backdrop-filter: url("#liquid-glass")` 让 SVG 滤镜处理元素背景（backdrop）。
- 位移贴图（256×64）的 R 通道控制水平位移、B 通道控制垂直位移，公式 `d = scale × (value/255 − 0.5)`，128 = 不位移。
- 贴图剖面：中心平台（不位移）+ 边缘约 16px 内急剧爬升 = 等宽边缘折射带，模拟弧形玻璃边缘的弯光；负 scale（-140）产生放大透镜效果。
- 同一张贴图以 -140/-124/-108 三个 scale 各位移一次，按 RGB 单通道拆开再 screen 混合，形成色散（彩虹边缘）。
- 不支持 `backdrop-filter: url()` 的浏览器（Safari、Firefox）通过 `@supports` 自动降级为 `blur(12px) saturate(1.5)` 磨砂玻璃。

**用法**

```js
import { injectLiquidGlassFilter } from 'liquid-glass';
import 'liquid-glass/css';
injectLiquidGlassFilter();
```

```html
<nav class="liquid-glass">…</nav>
```

React：`import { LiquidGlass } from 'liquid-glass/react'`，用 `<LiquidGlass>` 包裹内容即可。

**自定义**：`scales`（折射强度/色散差）、`saturate`（饱和度提升）、`id`（滤镜 id）；可用 `node scripts/generate-map.mjs out.png` 重新生成贴图（参数见上文英文章节）。

**浏览器支持**：Chrome/Edge 全效果；Firefox、Safari 降级为磨砂模糊。

**运行 demo**：仓库根目录 `python3 -m http.server` 后访问 `http://localhost:8000/demo/`（`file://` 直接双击打不开，浏览器会拦截 ESM 导入；请用 Chrome/Edge 查看完整效果）。

## License

MIT © ccl125
