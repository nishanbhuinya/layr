"use client";

/**
 * LAYR v2 Utility Functions
 * Centralized export of all utilities
 */

export {
  // Gradient factories
  LinearGradient,
  RadialGradient,
  ConicGradient,
  DiamondGradient,
  // Gradient converters (internal)
  gradientToCSS,
  isGradient,
} from "./gradients";

export {
  // EdgeInsets utilities
  edgeInsetsToCSS,
  resolvePadding,
  resolveMargin,
  // Flutter-style helpers
  EdgeInsetsAll,
  EdgeInsetsSymmetric,
  EdgeInsetsOnly,
} from "./edge-insets";

export {
  // Border utilities
  BorderAll,
  BorderRadiusCircular,
  boxBorderToCSS,
  type BoxBorder,
  type BorderSide,
} from "./borders";
