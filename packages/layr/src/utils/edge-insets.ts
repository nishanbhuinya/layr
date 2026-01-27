"use client";

import type { EdgeInsets } from "../types/layout";

// ============================================================================
// EDGE INSETS UTILITIES
// ============================================================================

/**
 * Converts EdgeInsets to CSS padding/margin string
 * Supports all Flutter EdgeInsets patterns:
 * - EdgeInsets.all(value)
 * - EdgeInsets.symmetric(horizontal, vertical)
 * - EdgeInsets.only(top, right, bottom, left)
 * 
 * @param insets - EdgeInsets object or number
 * @returns CSS padding/margin string (e.g., "16px" or "10px 20px")
 * 
 * @internal
 */
export const edgeInsetsToCSS = (
  insets: number | EdgeInsets | undefined,
): string | undefined => {
  if (insets === undefined) return undefined;

  // Simple number → apply to all sides
  if (typeof insets === "number") {
    return `${insets}px`;
  }

  // EdgeInsets.all(value)
  if ("all" in insets && insets.all !== undefined) {
    return `${insets.all}px`;
  }

  // EdgeInsets.symmetric({ horizontal?, vertical? })
  if ("horizontal" in insets || "vertical" in insets) {
    const vertical = insets.vertical ?? 0;
    const horizontal = insets.horizontal ?? 0;
    return `${vertical}px ${horizontal}px`;
  }

  // EdgeInsets.only({ top?, right?, bottom?, left? })
  if (
    "top" in insets ||
    "right" in insets ||
    "bottom" in insets ||
    "left" in insets
  ) {
    const top = insets.top ?? 0;
    const right = insets.right ?? 0;
    const bottom = insets.bottom ?? 0;
    const left = insets.left ?? 0;
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  // Fallback
  return "0px";
};

/**
 * Resolves padding with priority system:
 * 1. Individual props (paddingTop, paddingRight, etc.)
 * 2. Symmetric props (paddingHorizontal, paddingVertical)
 * 3. Base padding prop
 * 
 * @param padding - Base padding value
 * @param overrides - Individual padding overrides
 * @returns Resolved padding object { top, right, bottom, left }
 * 
 * @internal
 */
export const resolvePadding = (
  padding?: number | EdgeInsets,
  overrides?: {
    paddingHorizontal?: number;
    paddingVertical?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  },
): { top: number; right: number; bottom: number; left: number } => {
  const result = { top: 0, right: 0, bottom: 0, left: 0 };

  // Apply base padding
  if (typeof padding === "number") {
    result.top = result.right = result.bottom = result.left = padding;
  } else if (padding) {
    if ("all" in padding && padding.all !== undefined) {
      // EdgeInsets.all(value)
      result.top = result.right = result.bottom = result.left = padding.all;
    } else if ("horizontal" in padding || "vertical" in padding) {
      // EdgeInsets.symmetric({ horizontal?, vertical? })
      if (padding.horizontal !== undefined) {
        result.left = result.right = padding.horizontal;
      }
      if (padding.vertical !== undefined) {
        result.top = result.bottom = padding.vertical;
      }
    } else if (
      "top" in padding ||
      "right" in padding ||
      "bottom" in padding ||
      "left" in padding
    ) {
      // EdgeInsets.only({ top?, right?, bottom?, left? })
      result.top = padding.top ?? 0;
      result.right = padding.right ?? 0;
      result.bottom = padding.bottom ?? 0;
      result.left = padding.left ?? 0;
    }
  }

  // Apply overrides (highest priority)
  if (overrides) {
    if (overrides.paddingHorizontal !== undefined) {
      result.left = result.right = overrides.paddingHorizontal;
    }
    if (overrides.paddingVertical !== undefined) {
      result.top = result.bottom = overrides.paddingVertical;
    }
    if (overrides.paddingTop !== undefined) result.top = overrides.paddingTop;
    if (overrides.paddingRight !== undefined)
      result.right = overrides.paddingRight;
    if (overrides.paddingBottom !== undefined)
      result.bottom = overrides.paddingBottom;
    if (overrides.paddingLeft !== undefined)
      result.left = overrides.paddingLeft;
  }

  return result;
};

/**
 * Resolves margin with priority system (same as padding)
 * 
 * @internal
 */
export const resolveMargin = (
  margin?: number | EdgeInsets,
  overrides?: {
    marginHorizontal?: number;
    marginVertical?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
  },
): { top: number; right: number; bottom: number; left: number } => {
  const result = { top: 0, right: 0, bottom: 0, left: 0 };

  // Apply base margin
  if (typeof margin === "number") {
    result.top = result.right = result.bottom = result.left = margin;
  } else if (margin) {
    if ("all" in margin && margin.all !== undefined) {
      // EdgeInsets.all(value)
      result.top = result.right = result.bottom = result.left = margin.all;
    } else if ("horizontal" in margin || "vertical" in margin) {
      // EdgeInsets.symmetric({ horizontal?, vertical? })
      if (margin.horizontal !== undefined) {
        result.left = result.right = margin.horizontal;
      }
      if (margin.vertical !== undefined) {
        result.top = result.bottom = margin.vertical;
      }
    } else if (
      "top" in margin ||
      "right" in margin ||
      "bottom" in margin ||
      "left" in margin
    ) {
      // EdgeInsets.only({ top?, right?, bottom?, left? })
      result.top = margin.top ?? 0;
      result.right = margin.right ?? 0;
      result.bottom = margin.bottom ?? 0;
      result.left = margin.left ?? 0;
    }
  }

  // Apply overrides
  if (overrides) {
    if (overrides.marginHorizontal !== undefined) {
      result.left = result.right = overrides.marginHorizontal;
    }
    if (overrides.marginVertical !== undefined) {
      result.top = result.bottom = overrides.marginVertical;
    }
    if (overrides.marginTop !== undefined) result.top = overrides.marginTop;
    if (overrides.marginRight !== undefined)
      result.right = overrides.marginRight;
    if (overrides.marginBottom !== undefined)
      result.bottom = overrides.marginBottom;
    if (overrides.marginLeft !== undefined) result.left = overrides.marginLeft;
  }

  return result;
};

// ============================================================================
// FLUTTER-STYLE HELPER FUNCTIONS
// ============================================================================

/**
 * Creates EdgeInsets with same value on all sides
 * Equivalent to Flutter's EdgeInsets.all(value)
 */
export const EdgeInsetsAll = (value: number): EdgeInsets => ({ all: value });

/**
 * Creates EdgeInsets with symmetric values
 * Equivalent to Flutter's EdgeInsets.symmetric()
 */
export const EdgeInsetsSymmetric = ({
  horizontal,
  vertical,
}: {
  horizontal?: number;
  vertical?: number;
}): EdgeInsets => ({ horizontal, vertical });

/**
 * Creates EdgeInsets with individual side values
 * Equivalent to Flutter's EdgeInsets.only()
 */
export const EdgeInsetsOnly = ({
  top,
  right,
  bottom,
  left,
}: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}): EdgeInsets => ({ top, right, bottom, left });
