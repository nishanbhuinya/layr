"use client";

// ============================================================================
// BORDER UTILITIES
// ============================================================================

/**
 * Border side configuration
 */
export interface BorderSide {
  width: number;
  color: string;
  style?: "solid" | "dashed" | "dotted";
}

/**
 * Box border configuration (Flutter pattern)
 */
export interface BoxBorder {
  top?: BorderSide;
  right?: BorderSide;
  bottom?: BorderSide;
  left?: BorderSide;
}

/**
 * Creates a uniform border on all sides
 * Equivalent to Flutter's Border.all()
 * 
 * @example
 * ```tsx
 * <Box decoration={{
 *   border: BorderAll({ width: 2, color: "#3b82f6", style: "solid" })
 * }} />
 * ```
 */
export const BorderAll = ({
  width = 1,
  color = "#000000",
  style = "solid",
}: {
  width?: number;
  color?: string;
  style?: "solid" | "dashed" | "dotted";
}): BoxBorder => {
  const side: BorderSide = { width, color, style };
  return { top: side, right: side, bottom: side, left: side };
};

/**
 * Creates uniform circular border radius
 * Equivalent to Flutter's BorderRadius.circular()
 * 
 * @example
 * ```tsx
 * <Box decoration={{ borderRadius: BorderRadiusCircular(12) }} />
 * ```
 */
export const BorderRadiusCircular = (radius: number): number => radius;

/**
 * Converts BoxBorder to CSS border strings
 * @returns Object with border properties for each side
 * @internal
 */
export const boxBorderToCSS = (
  border: BoxBorder,
): {
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
} => {
  const result: {
    borderTop?: string;
    borderRight?: string;
    borderBottom?: string;
    borderLeft?: string;
  } = {};

  if (border.top) {
    result.borderTop = `${border.top.width}px ${border.top.style || "solid"} ${border.top.color}`;
  }
  if (border.right) {
    result.borderRight = `${border.right.width}px ${border.right.style || "solid"} ${border.right.color}`;
  }
  if (border.bottom) {
    result.borderBottom = `${border.bottom.width}px ${border.bottom.style || "solid"} ${border.bottom.color}`;
  }
  if (border.left) {
    result.borderLeft = `${border.left.width}px ${border.left.style || "solid"} ${border.left.color}`;
  }

  return result;
};
