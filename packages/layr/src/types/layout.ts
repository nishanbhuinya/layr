"use client";

/**
 * LAYR v2 Layout Type System
 * Shared types for alignment, sizing, and positioning
 */

// ============================================================================
// ALIGNMENT TYPES
// ============================================================================

/**
 * Alignment positions (Flutter-compatible, all lowercase)
 */
export type Alignment =
  | "topleft"
  | "topcenter"
  | "topright"
  | "centerleft"
  | "center"
  | "centerright"
  | "bottomleft"
  | "bottomcenter"
  | "bottomright";

/**
 * Main axis alignment (for Row/Column)
 */
export type MainAxisAlignment =
  | "start"
  | "center"
  | "end"
  | "spacebetween"
  | "spacearound"
  | "spaceevenly";

/**
 * Cross axis alignment (for Row/Column)
 */
export type CrossAxisAlignment =
  | "start"
  | "center"
  | "end"
  | "stretch"
  | "baseline";

/**
 * Main axis size behavior
 */
export type MainAxisSize = "min" | "max";

/**
 * Text/layout direction
 */
export type TextDirection = "ltr" | "rtl";

/**
 * Vertical direction (for Column)
 */
export type VerticalDirection = "down" | "up";

// ============================================================================
// BOX MODEL TYPES
// ============================================================================

/**
 * EdgeInsets for padding and margin (Flutter pattern)
 * LAYR v2: Supports all Flutter patterns
 */
export type EdgeInsets =
  | { all: number }
  | { horizontal?: number; vertical?: number }
  | { top?: number; right?: number; bottom?: number; left?: number };

/**
 * Box constraints (Flutter pattern)
 */
export interface BoxConstraints {
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
}

/**
 * Box shape (rectangle or circle)
 */
export type BoxShape = "rectangle" | "circle";

/**
 * Clip behavior
 */
export type ClipBehavior = "none" | "hidden" | "scroll" | "auto";

// ============================================================================
// OVERFLOW & SIZING
// ============================================================================

/**
 * Overflow behavior
 */
export type OverflowBehavior = "visible" | "hidden" | "scroll" | "auto";

/**
 * Object fit (for images, videos)
 */
export type ObjectFit = "cover" | "contain" | "fill" | "none" | "scale-down";
