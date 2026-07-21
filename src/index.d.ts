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

export interface LiquidGlassFilterUpdateOptions {
  /** Filter id to look up. */
  id?: string;
  /** New R/G/B displacement scales. */
  scales?: [number, number, number];
  /** New saturation boost. */
  saturate?: number;
}

/**
 * Update an already-injected filter in place (only the options passed).
 * Returns false if no filter with that id exists, true on success.
 */
export declare function updateLiquidGlassFilter(
  options?: LiquidGlassFilterUpdateOptions,
): boolean;

/** 256x64 RGBA displacement map as a data URI. */
export declare const liquidGlassMap: string;
