"use client";

/**
 * LAYR v2 Gradient Type System
 * Supports extended ranges (-∞ to +∞) and multiple gradient types
 */

// ============================================================================
// GRADIENT POSITIONS
// ============================================================================

/**
 * Named gradient positions (all lowercase per LAYR v2 convention)
 */
export type GradientPosition =
  | "topleft"
  | "top"
  | "topright"
  | "topcenter"      // Alias for "top"
  | "left"
  | "center"
  | "right"
  | "centerleft"     // Alias for "left"
  | "centerright"    // Alias for "right"
  | "bottomleft"
  | "bottom"
  | "bottomright"
  | "bottomcenter";  // Alias for "bottom"

/**
 * Directional shortcuts for linear gradients
 */
export type GradientDirection =
  | "toright"
  | "toleft"
  | "totop"
  | "tobottom"
  | "totopright"
  | "totopleft"
  | "tobottomright"
  | "tobottomleft";

/**
 * Gradient tiling modes (for extended stops)
 */
export type GradientTileMode = "clamp" | "repeat" | "mirror";

// ============================================================================
// LINEAR GRADIENT
// ============================================================================

/**
 * Linear gradient configuration
 * 
 * @example Basic usage
 * ```tsx
 * LinearGradient({
 *   colors: ["#667eea", "#764ba2"],
 *   direction: "toright"
 * })
 * ```
 * 
 * @example Extended stops (bleeds beyond container)
 * ```tsx
 * LinearGradient({
 *   colors: ["#ff0000", "#ffffff", "#0000ff"],
 *   stops: [-0.5, 0.5, 1.5],
 *   direction: "toright"
 * })
 * ```
 */
export interface LinearGradientProps {
  /**
   * Array of color stops (minimum 2 colors required)
   * Accepts any valid CSS color: hex, rgb, rgba, hsl, named colors
   */
  colors: string[];

  /**
   * Position of each color along the gradient line
   * Range: -∞ to +∞ (default: evenly distributed 0 to 1)
   * 
   * @example
   * stops: [0, 0.5, 1]        // Standard distribution
   * stops: [-0.2, 0.5, 1.2]   // Extended range (bleeds)
   */
  stops?: number[];

  /**
   * Start position of gradient (choose ONE: begin/end OR direction OR angle)
   */
  begin?: GradientPosition;

  /**
   * End position of gradient
   */
  end?: GradientPosition;

  /**
   * Directional shortcut (overrides begin/end if provided)
   */
  direction?: GradientDirection;

  /**
   * Angle in degrees (overrides begin/end/direction if provided)
   * 0° = up, 90° = right, 180° = down, 270° = left
   */
  angle?: number;

  /**
   * How to handle stops outside 0-1 range
   * @default "clamp"
   */
  tileMode?: GradientTileMode;
}

// ============================================================================
// RADIAL GRADIENT
// ============================================================================

/**
 * Radial gradient configuration
 * 
 * @example Simple radial burst
 * ```tsx
 * RadialGradient({
 *   colors: ["#fbc2eb", "#a6c1ee"],
 *   center: "center"
 * })
 * ```
 */
export interface RadialGradientProps {
  colors: string[];
  stops?: number[];

  /**
   * Named center position
   * @default "center"
   */
  center?: GradientPosition;

  /**
   * Precise center X coordinate (-∞ to +∞, 0.5 = center)
   * Overrides center if provided
   */
  centerX?: number;

  /**
   * Precise center Y coordinate (-∞ to +∞, 0.5 = center)
   * Overrides center if provided
   */
  centerY?: number;

  /**
   * Gradient radius (0 to ∞)
   * @default 0.5 (50% of shortest side)
   */
  radius?: number;

  /**
   * Focal point for elliptical gradients
   */
  focal?: GradientPosition;

  /**
   * Focal radius (0 to ∞)
   */
  focalRadius?: number;

  tileMode?: GradientTileMode;
}

// ============================================================================
// CONIC GRADIENT (Angular)
// ============================================================================

/**
 * Conic/Angular gradient configuration
 * 
 * @example Rainbow spinner
 * ```tsx
 * ConicGradient({
 *   colors: ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"],
 *   center: "center"
 * })
 * ```
 */
export interface ConicGradientProps {
  colors: string[];

  /**
   * Position of each color along the gradient circle
   * Range: 0-1 (represents 0-360°)
   */
  stops?: number[];

  center?: GradientPosition;
  centerX?: number;
  centerY?: number;

  /**
   * Start angle in degrees
   * @default 0 (top)
   */
  angle?: number;

  tileMode?: GradientTileMode;
}

// ============================================================================
// DIAMOND GRADIENT (LAYR Extension)
// ============================================================================

/**
 * Diamond-shaped gradient (no native CSS equivalent)
 * Renders as SVG or canvas fallback
 */
export interface DiamondGradientProps {
  colors: string[];
  stops?: number[];
  center?: GradientPosition;
  centerX?: number;
  centerY?: number;
  tileMode?: GradientTileMode;
}

// ============================================================================
// GRADIENT INSTANCE (Union Type)
// ============================================================================

/**
 * Discriminated union of all gradient types
 */
export type GradientInstance =
  | { type: "linear"; props: LinearGradientProps }
  | { type: "radial"; props: RadialGradientProps }
  | { type: "conic"; props: ConicGradientProps }
  | { type: "diamond"; props: DiamondGradientProps };

/**
 * Background value (solid color, gradient, or future: image/video)
 */
export type BackgroundValue =
  | string              // Solid color
  | GradientInstance;   // Any gradient type
