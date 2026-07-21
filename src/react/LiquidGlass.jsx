import { useEffect } from 'react';
import { injectLiquidGlassFilter } from '../core.js';

/**
 * LiquidGlass — wraps children in a div with the `liquid-glass` class and
 * injects the SVG displacement filter on mount.
 *
 * Remember to also load the stylesheet (src/liquid-glass.css), e.g.
 * `import 'liquid-glass/css';` (your bundler must handle CSS imports)
 * or a plain <link> tag.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] Extra classes, merged after `liquid-glass`.
 * @param {React.CSSProperties} [props.style]
 * @param {string} [props.filterId] Custom filter id (requires matching CSS).
 * @param {[number, number, number]} [props.scales] Refraction scales R/G/B.
 * @param {number} [props.saturate] Saturation boost.
 */
export function LiquidGlass({ children, className, style, filterId, scales, saturate }) {
  useEffect(
    () => injectLiquidGlassFilter({ id: filterId, scales, saturate }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterId, saturate, JSON.stringify(scales)],
  );

  const cls = className ? `liquid-glass ${className}` : 'liquid-glass';
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}

export default LiquidGlass;
