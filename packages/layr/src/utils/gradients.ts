"use client";

import type {
  LinearGradientProps,
  RadialGradientProps,
  ConicGradientProps,
  DiamondGradientProps,
  GradientInstance,
  GradientPosition,
  GradientDirection,
} from "../types/gradients";

// ============================================================================
// POSITION RESOLVERS
// ============================================================================

/**
 * Maps GradientPosition to CSS percentage coordinates
 * Returns [x%, y%] tuple
 */
const positionToCoordinates = (position: GradientPosition): [number, number] => {
  const map: Record<GradientPosition, [number, number]> = {
    topleft: [0, 0],
    top: [50, 0],
    topcenter: [50, 0],
    topright: [100, 0],
    left: [0, 50],
    centerleft: [0, 50],
    center: [50, 50],
    right: [100, 50],
    centerright: [100, 50],
    bottomleft: [0, 100],
    bottom: [50, 100],
    bottomcenter: [50, 100],
    bottomright: [100, 100],
  };
  return map[position] || [50, 50]; // Default to center if invalid
};

/**
 * Maps GradientDirection to CSS linear-gradient direction syntax
 */
const directionToCSS = (direction: GradientDirection): string => {
  const map: Record<GradientDirection, string> = {
    toright: "to right",
    toleft: "to left",
    totop: "to top",
    tobottom: "to bottom",
    totopright: "to top right",
    totopleft: "to top left",
    tobottomright: "to bottom right",
    tobottomleft: "to bottom left",
  };
  return map[direction] || "to bottom"; // Default fallback
};

/**
 * Converts angle (degrees) to CSS gradient angle
 * LAYR convention: 0° = up, 90° = right (matches CSS)
 */
const angleToCSS = (angle: number): string => {
  return `${angle}deg`;
};

/**
 * Resolves begin/end positions to CSS direction string
 */
const resolveLinearDirection = (
  begin?: GradientPosition,
  end?: GradientPosition,
): string => {
  if (!begin || !end) return "to bottom"; // Default

  const [x1, y1] = positionToCoordinates(begin);
  const [x2, y2] = positionToCoordinates(end);

  // Calculate direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Convert to angle (Math.atan2 returns radians)
  const angleRad = Math.atan2(dx, -dy); // Negative dy because CSS Y-axis is inverted
  const angleDeg = (angleRad * 180) / Math.PI;

  return `${angleDeg}deg`;
};

// ============================================================================
// COLOR STOP BUILDER
// ============================================================================

/**
 * Generates CSS color stop string from colors and stops arrays
 * 
 * @param colors - Array of CSS color values
 * @param stops - Optional array of stop positions (0-1 or extended range)
 * @returns CSS color stops string (e.g., "#ff0000 0%, #0000ff 100%")
 */
const buildColorStops = (colors: string[], stops?: number[]): string => {
  // Validate input
  if (colors.length < 2) {
    console.warn("LAYR Gradient: At least 2 colors required. Using fallback.");
    return "#000000 0%, #ffffff 100%";
  }

  // Auto-distribute stops if not provided
  const resolvedStops =
    stops || colors.map((_, i) => i / (colors.length - 1));

  // Validate stops array length matches colors
  if (resolvedStops.length !== colors.length) {
    console.warn(
      `LAYR Gradient: stops array length (${resolvedStops.length}) must match colors length (${colors.length}). Auto-distributing.`,
    );
    const autoStops = colors.map((_, i) => i / (colors.length - 1));
    return colors
      .map((color, i) => `${color} ${autoStops[i] * 100}%`)
      .join(", ");
  }

  // Build color stops with extended range support
  return colors
    .map((color, i) => {
      const position = resolvedStops[i] * 100;
      return `${color} ${position}%`;
    })
    .join(", ");
};

// ============================================================================
// LINEAR GRADIENT
// ============================================================================

/**
 * Creates a linear gradient instance
 * Compiles to CSS linear-gradient() string
 * 
 * @param props - Linear gradient configuration
 * @returns Gradient instance for use with background prop
 * 
 * @example Basic usage
 * ```tsx
 * LinearGradient({
 *   colors: ["#667eea", "#764ba2"],
 *   direction: "toright"
 * })
 * ```
 * 
 * @example Extended stops
 * ```tsx
 * LinearGradient({
 *   colors: ["#ff0000", "#ffffff", "#0000ff"],
 *   stops: [-0.5, 0.5, 1.5],
 *   direction: "toright"
 * })
 * ```
 * 
 * @example With angle
 * ```tsx
 * LinearGradient({
 *   colors: ["#667eea", "#764ba2"],
 *   angle: 45
 * })
 * ```
 */
export const LinearGradient = (
  props: LinearGradientProps,
): GradientInstance => {
  return {
    type: "linear",
    props,
  };
};

/**
 * Converts LinearGradient instance to CSS string
 * @internal
 */
export const linearGradientToCSS = (props: LinearGradientProps): string => {
  const { colors, stops, begin, end, direction, angle } = props;

  // Determine direction (priority: angle > direction > begin/end)
  let directionStr: string;
  if (angle !== undefined) {
    directionStr = angleToCSS(angle);
  } else if (direction) {
    directionStr = directionToCSS(direction);
  } else if (begin && end) {
    directionStr = resolveLinearDirection(begin, end);
  } else {
    directionStr = "to bottom"; // Default fallback
  }

  const colorStops = buildColorStops(colors, stops);

  return `linear-gradient(${directionStr}, ${colorStops})`;
};

// ============================================================================
// RADIAL GRADIENT (FIXED)
// ============================================================================

/**
 * Creates a radial gradient instance
 * Compiles to CSS radial-gradient() string
 * 
 * @param props - Radial gradient configuration
 * @returns Gradient instance for use with background prop
 * 
 * @example Simple radial burst
 * ```tsx
 * RadialGradient({
 *   colors: ["#fbc2eb", "#a6c1ee"],
 *   center: "center"
 * })
 * ```
 * 
 * @example Off-center with extended radius
 * ```tsx
 * RadialGradient({
 *   colors: ["#fff", "#000"],
 *   center: "topleft",
 *   radius: 1.5  // 150% of container diagonal
 * })
 * ```
 * 
 * @example Precise positioning
 * ```tsx
 * RadialGradient({
 *   colors: ["red", "blue"],
 *   centerX: 0.3,
 *   centerY: 0.7,
 *   radius: 0.5
 * })
 * ```
 */
export const RadialGradient = (
  props: RadialGradientProps,
): GradientInstance => {
  return {
    type: "radial",
    props,
  };
};

/**
 * Converts RadialGradient instance to CSS string
 * 
 * FIXED: Proper CSS syntax for radius parameter
 * 
 * CSS Syntax: radial-gradient(circle <size> at <position>, <color-stops>)
 * Where <size> can be:
 * - closest-side: gradient extends to closest edge
 * - farthest-side: gradient extends to farthest edge
 * - closest-corner: gradient extends to closest corner
 * - farthest-corner: gradient extends to farthest corner (default)
 * - <length>: explicit size (e.g., 150px, 50%, 100vw)
 * 
 * @internal
 */
export const radialGradientToCSS = (props: RadialGradientProps): string => {
  const { colors, stops, center, centerX, centerY, radius } = props;

  // Resolve center position
  let centerStr: string;
  if (centerX !== undefined && centerY !== undefined) {
    // Precise coordinates (0-1 range → percentage)
    centerStr = `at ${centerX * 100}% ${centerY * 100}%`;
  } else if (center) {
    const [x, y] = positionToCoordinates(center);
    centerStr = `at ${x}% ${y}%`;
  } else {
    centerStr = "at center"; // Default
  }

  // FIXED: Proper radius handling
  // radius parameter is a multiplier:
  // - 1.0 = 100% of container (approximately diagonal distance)
  // - 1.5 = 150% of container
  // - 0.5 = 50% of container
  let sizeStr: string;
  if (radius !== undefined) {
    // Convert radius multiplier to viewport units for consistent scaling
    // Use max(width, height) as reference to ensure full coverage
    const scaledRadius = radius * 100;
    sizeStr = `${scaledRadius}%`;
  } else {
    // Default: farthest-corner ensures gradient covers entire container
    sizeStr = "farthest-corner";
  }

  const colorStops = buildColorStops(colors, stops);

  // Correct CSS syntax: radial-gradient(circle <size> at <position>, <color-stops>)
  return `radial-gradient(circle ${sizeStr} ${centerStr}, ${colorStops})`;
};

// ============================================================================
// CONIC GRADIENT (Angular)
// ============================================================================

/**
 * Creates a conic/angular gradient instance
 * Compiles to CSS conic-gradient() string
 * 
 * @param props - Conic gradient configuration
 * @returns Gradient instance for use with background prop
 * 
 * @example Rainbow spinner
 * ```tsx
 * ConicGradient({
 *   colors: ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"],
 *   center: "center"
 * })
 * ```
 * 
 * @example Pie chart slice
 * ```tsx
 * ConicGradient({
 *   colors: ["#667eea", "#764ba2"],
 *   stops: [0, 0.125],  // 0-45° (1/8 of circle)
 *   angle: 90  // Start from right
 * })
 * ```
 * 
 * @example Loading spinner
 * ```tsx
 * ConicGradient({
 *   colors: ["transparent", "#3b82f6"],
 *   stops: [0.75, 1],
 *   angle: 0
 * })
 * ```
 */
export const ConicGradient = (props: ConicGradientProps): GradientInstance => {
  return {
    type: "conic",
    props,
  };
};

/**
 * Converts ConicGradient instance to CSS string
 * @internal
 */
export const conicGradientToCSS = (props: ConicGradientProps): string => {
  const { colors, stops, center, centerX, centerY, angle } = props;

  // Resolve center position
  let centerStr: string;
  if (centerX !== undefined && centerY !== undefined) {
    centerStr = `at ${centerX * 100}% ${centerY * 100}%`;
  } else if (center) {
    const [x, y] = positionToCoordinates(center);
    centerStr = `at ${x}% ${y}%`;
  } else {
    centerStr = "at center";
  }

  // Resolve start angle
  const angleStr = angle !== undefined ? `from ${angle}deg` : "";

  // Build color stops (for conic, stops are 0-1 representing 0-360°)
  const colorStops = buildColorStops(
    colors,
    stops?.map((stop) => stop), // Conic uses 0-1 directly (no *100)
  );

  // Construct CSS (handle optional angle)
  const parts = [angleStr, centerStr].filter(Boolean).join(" ");
  const prefix = parts ? `${parts}, ` : "";

  return `conic-gradient(${prefix}${colorStops})`;
};

// ============================================================================
// DIAMOND GRADIENT (FIXED - True Diamond Shape)
// ============================================================================

/**
 * Creates a diamond gradient instance
 * 
 * Note: No native CSS support - renders as SVG data URI with actual diamond shapes
 * 
 * @param props - Diamond gradient configuration
 * @returns Gradient instance for use with background prop
 * 
 * @example Diamond burst
 * ```tsx
 * DiamondGradient({
 *   colors: ["#ff0000", "#0000ff"],
 *   center: "center"
 * })
 * ```
 * 
 * @example Multi-color diamond
 * ```tsx
 * DiamondGradient({
 *   colors: ["#667eea", "#764ba2", "#f093fb"],
 *   stops: [0, 0.5, 1],
 *   center: "center"
 * })
 * ```
 * 
 * @example Off-center diamond
 * ```tsx
 * DiamondGradient({
 *   colors: ["red", "yellow", "green"],
 *   centerX: 0.3,
 *   centerY: 0.7
 * })
 * ```
 */
export const DiamondGradient = (
  props: DiamondGradientProps,
): GradientInstance => {
  return {
    type: "diamond",
    props,
  };
};

/**
 * Converts DiamondGradient to SVG data URI with true diamond/rhombus shapes
 * 
 * FIXED: Now generates actual diamond shapes using SVG paths instead of radial gradient
 * 
 * Implementation:
 * - Creates concentric diamond (45° rotated square) shapes
 * - Each color stop = one diamond layer
 * - Properly blends colors using SVG path fills
 * - Respects center positioning
 * 
 * @internal
 */
export const diamondGradientToCSS = (props: DiamondGradientProps): string => {
  const { colors, stops, center, centerX, centerY } = props;

  // Resolve center (convert to 0-1 range for SVG calculations)
  const [cx, cy] =
    centerX !== undefined && centerY !== undefined
      ? [centerX, centerY]
      : center
        ? positionToCoordinates(center).map((v) => v / 100) as [number, number]
        : [0.5, 0.5];

  const resolvedStops = stops || colors.map((_, i) => i / (colors.length - 1));

  // SVG viewBox size (higher = smoother but larger file)
  const svgSize = 1000;
  const centerX_px = cx * svgSize;
  const centerY_px = cy * svgSize;

  // Generate diamond paths for each color stop
  // Diamonds are rendered from largest to smallest (reverse order)
  // This creates a layered effect where inner colors overlay outer ones
  const diamonds = colors
    .map((color, i) => {
      const stop = resolvedStops[i];
      
      // Scale from center (0 = center point, 1 = edge of container)
      // Multiply by sqrt(2) to ensure diagonal coverage
      const size = stop * svgSize * Math.SQRT2;

      // Diamond corners (45° rotated square)
      // Top, Right, Bottom, Left corners forming a diamond
      const top = `${centerX_px},${centerY_px - size}`;
      const right = `${centerX_px + size},${centerY_px}`;
      const bottom = `${centerX_px},${centerY_px + size}`;
      const left = `${centerX_px - size},${centerY_px}`;

      // SVG path: M = move to, L = line to, Z = close path
      return `<path d="M${top} L${right} L${bottom} L${left} Z" fill="${color}" />`;
    })
    .reverse() // Reverse to draw largest first (background)
    .join("");

  // Construct SVG with diamonds
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" preserveAspectRatio="none">${diamonds}</svg>`;

  // Encode for data URI (compact whitespace for smaller size)
  const encoded = encodeURIComponent(svg.replace(/\s+/g, " ").trim());
  return `url('data:image/svg+xml,${encoded}')`;
};

// ============================================================================
// UNIFIED GRADIENT CONVERTER
// ============================================================================

/**
 * Converts any GradientInstance to CSS-ready string
 * Used internally by components to render gradients
 * 
 * @param gradient - GradientInstance object
 * @returns CSS background value
 * 
 * @internal
 */
export const gradientToCSS = (gradient: GradientInstance): string => {
  switch (gradient.type) {
    case "linear":
      return linearGradientToCSS(gradient.props);
    case "radial":
      return radialGradientToCSS(gradient.props);
    case "conic":
      return conicGradientToCSS(gradient.props);
    case "diamond":
      return diamondGradientToCSS(gradient.props);
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = gradient;
      console.error("LAYR: Unknown gradient type", _exhaustive);
      return "transparent";
    }
  }
};

/**
 * Type guard to check if a value is a GradientInstance
 * 
 * @param value - Any value to check
 * @returns True if value is a GradientInstance
 * 
 * @internal
 */
export const isGradient = (value: unknown): value is GradientInstance => {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "props" in value &&
    ["linear", "radial", "conic", "diamond"].includes(
      (value as GradientInstance).type,
    )
  );
};
