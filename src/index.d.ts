export interface LiquidGlassFilterOptions {
  /** Filter id. Must match the id in your CSS `backdrop-filter: url("#...")`. */
  id?: string;
  /**
   * feDisplacementMap scales for the R/G/B passes.
   * Larger absolute values refract more; the spread controls dispersion.
   */
  scales?: [number, number, number];
  /** Final saturation boost. */
  saturate?: number;
}

export declare const DEFAULT_FILTER_ID: string;

/**
 * Inject the hidden SVG liquid glass filter into document.body.
 * Idempotent per id. Returns a cleanup function.
 */
export declare function injectLiquidGlassFilter(
  options?: LiquidGlassFilterOptions,
): () => void;

/** 256x64 RGBA displacement map as a data URI. */
export declare const liquidGlassMap: string;
