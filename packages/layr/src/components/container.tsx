'use client';

import type React from 'react';
import type { CSSProperties, ReactNode } from 'react';

// ============================================================================
// ENUMS - Flutter BoxShape
// ============================================================================

export enum BoxShape {
  rectangle = 'rectangle',
  circle = 'circle',
}

// ============================================================================
// TYPES - Flutter-like API
// ============================================================================

/**
 * EdgeInsets for padding and margin (Flutter pattern)
 */
export type EdgeInsets = 
  | { all: number }
  | { horizontal?: number; vertical?: number }
  | { top?: number; right?: number; bottom?: number; left?: number };

/**
 * BoxShadow - Single shadow definition
 */
export interface BoxShadow {
  color?: string;
  offset?: { dx: number; dy: number };
  blurRadius?: number;
  spreadRadius?: number;
}

/**
 * DecorationImage - Background image configuration
 */
export interface DecorationImage {
  image: string; // URL or path
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  alignment?: string; // CSS background-position
  repeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  opacity?: number;
}

/**
 * Gradient - Linear or Radial gradient
 */
export interface Gradient {
  type?: 'linear' | 'radial';
  colors: string[];
  stops?: number[]; // 0.0 to 1.0
  begin?: string; // CSS direction (e.g., 'to right', '45deg')
  end?: string;
  center?: string; // For radial gradients
}

/**
 * BoxBorder - Border configuration
 */
export interface BoxBorder {
  top?: { width: number; color: string; style?: 'solid' | 'dashed' | 'dotted' };
  bottom?: { width: number; color: string; style?: 'solid' | 'dashed' | 'dotted' };
  left?: { width: number; color: string; style?: 'solid' | 'dashed' | 'dotted' };
  right?: { width: number; color: string; style?: 'solid' | 'dashed' | 'dotted' };
}

/**
 * BoxDecoration - Complete decoration specification (Flutter pattern)
 */
export interface BoxDecoration {
  // Color (bottom layer)
  color?: string;

  // Image (above color)
  image?: DecorationImage;

  // Gradient (above color, below image)
  gradient?: Gradient;

  // Border
  border?: BoxBorder | string; // Can be BoxBorder object or CSS string

  // Border radius (ignored if shape is circle)
  borderRadius?: number | string;

  // Shape - circle or rectangle
  shape?: BoxShape;

  // Box shadows (array for multiple shadows)
  boxShadow?: BoxShadow[];

  // Blend mode
  backgroundBlendMode?: string;

  // Quick properties
  opacity?: number;
}

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
 * Alignment options (Flutter pattern)
 */
export type Alignment =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'centerLeft'
  | 'center'
  | 'centerRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight';

/**
 * Container Props - Mirrors Flutter Container API
 */
export interface ContainerProps {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;

  // Padding
  padding?: number | EdgeInsets;
  paddingHorizontal?: number;
  paddingVertical?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;

  // Margin
  margin?: number | EdgeInsets;
  marginHorizontal?: number;
  marginVertical?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;

  // Decoration (Flutter BoxDecoration)
  decoration?: BoxDecoration;
  foregroundDecoration?: BoxDecoration;
  color?: string; // Shorthand

  alignment?: Alignment;
  constraints?: BoxConstraints;
  transform?: string;
  transformAlignment?: Alignment;
  clipBehavior?: 'none' | 'hardEdge' | 'antiAlias';

  onTap?: () => void;
  onClick?: () => void;
  cursor?: 'pointer' | 'default' | 'text' | 'none';

  className?: string;
  style?: CSSProperties;
  id?: string;
  role?: string;
  ariaLabel?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts EdgeInsets to CSS string
 */
function edgeInsetsToCSS(insets: number | EdgeInsets | undefined): string | undefined {
  if (insets === undefined) return undefined;
  if (typeof insets === 'number') return `${insets}px`;

  // Handle 'all' property
  if ('all' in insets) {
    return `${insets.all}px`;
  }

  // Handle 'horizontal' and 'vertical' properties
  if ('horizontal' in insets || 'vertical' in insets) {
    const horizontal = insets.horizontal ?? 0;
    const vertical = insets.vertical ?? 0;
    return `${vertical}px ${horizontal}px`;
  }

  // Handle individual sides
  if ('top' in insets || 'right' in insets || 'bottom' in insets || 'left' in insets) {
    const { top = 0, right = 0, bottom = 0, left = 0 } = insets;
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  // Fallback
  return '0px';
}

/**
 * Resolves padding with priority
 */
function resolvePadding(props: ContainerProps): { top?: number; right?: number; bottom?: number; left?: number } {
  const base: { top?: number; right?: number; bottom?: number; left?: number } = {};

  if (typeof props.padding === 'number') {
    base.top = base.bottom = base.left = base.right = props.padding;
  } else if (props.padding) {
    // Handle 'all' property
    if ('all' in props.padding) {
      base.top = base.bottom = base.left = base.right = props.padding.all;
    }
    // Handle 'horizontal' and 'vertical' properties
    else if ('horizontal' in props.padding || 'vertical' in props.padding) {
      if (props.padding.horizontal !== undefined) {
        base.left = base.right = props.padding.horizontal;
      }
      if (props.padding.vertical !== undefined) {
        base.top = base.bottom = props.padding.vertical;
      }
    }
    // Handle individual sides
    else {
      Object.assign(base, props.padding);
    }
  }

  if (props.paddingHorizontal !== undefined) {
    base.left = base.right = props.paddingHorizontal;
  }
  if (props.paddingVertical !== undefined) {
    base.top = base.bottom = props.paddingVertical;
  }

  if (props.paddingTop !== undefined) base.top = props.paddingTop;
  if (props.paddingBottom !== undefined) base.bottom = props.paddingBottom;
  if (props.paddingLeft !== undefined) base.left = props.paddingLeft;
  if (props.paddingRight !== undefined) base.right = props.paddingRight;

  return base;
}

/**
 * Resolves margin with priority
 */
function resolveMargin(props: ContainerProps): { top?: number; right?: number; bottom?: number; left?: number } {
  const base: { top?: number; right?: number; bottom?: number; left?: number } = {};

  if (typeof props.margin === 'number') {
    base.top = base.bottom = base.left = base.right = props.margin;
  } else if (props.margin) {
    // Handle 'all' property
    if ('all' in props.margin) {
      base.top = base.bottom = base.left = base.right = props.margin.all;
    }
    // Handle 'horizontal' and 'vertical' properties
    else if ('horizontal' in props.margin || 'vertical' in props.margin) {
      if (props.margin.horizontal !== undefined) {
        base.left = base.right = props.margin.horizontal;
      }
      if (props.margin.vertical !== undefined) {
        base.top = base.bottom = props.margin.vertical;
      }
    }
    // Handle individual sides
    else {
      Object.assign(base, props.margin);
    }
  }

  if (props.marginHorizontal !== undefined) {
    base.left = base.right = props.marginHorizontal;
  }
  if (props.marginVertical !== undefined) {
    base.top = base.bottom = props.marginVertical;
  }

  if (props.marginTop !== undefined) base.top = props.marginTop;
  if (props.marginBottom !== undefined) base.bottom = props.marginBottom;
  if (props.marginLeft !== undefined) base.left = props.marginLeft;
  if (props.marginRight !== undefined) base.right = props.marginRight;

  return base;
}

/**
 * Maps Flutter Alignment to CSS flexbox
 */
function alignmentToFlexbox(alignment?: Alignment): {
  justifyContent?: string;
  alignItems?: string;
  display?: string;
} {
  if (!alignment) return {};

  const map: Record<Alignment, { justifyContent: string; alignItems: string }> = {
    topLeft: { justifyContent: 'flex-start', alignItems: 'flex-start' },
    topCenter: { justifyContent: 'center', alignItems: 'flex-start' },
    topRight: { justifyContent: 'flex-end', alignItems: 'flex-start' },
    centerLeft: { justifyContent: 'flex-start', alignItems: 'center' },
    center: { justifyContent: 'center', alignItems: 'center' },
    centerRight: { justifyContent: 'flex-end', alignItems: 'center' },
    bottomLeft: { justifyContent: 'flex-start', alignItems: 'flex-end' },
    bottomCenter: { justifyContent: 'center', alignItems: 'flex-end' },
    bottomRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  };

  return {
    display: 'flex',
    ...map[alignment],
  };
}

/**
 * Converts BoxShadow array to CSS box-shadow string
 */
function boxShadowToCSS(shadows?: BoxShadow[]): string | undefined {
  if (!shadows || shadows.length === 0) return undefined;

  return shadows
    .map((shadow) => {
      const dx = shadow.offset?.dx || 0;
      const dy = shadow.offset?.dy || 0;
      const blur = shadow.blurRadius || 0;
      const spread = shadow.spreadRadius || 0;
      const color = shadow.color || 'rgba(0, 0, 0, 0.1)';

      return `${dx}px ${dy}px ${blur}px ${spread}px ${color}`;
    })
    .join(', ');
}

/**
 * Converts Gradient to CSS gradient string
 */
function gradientToCSS(gradient?: Gradient): string | undefined {
  if (!gradient || gradient.colors.length === 0) return undefined;

  const { type = 'linear', colors, stops, begin = 'to right' } = gradient;

  let colorStops: string;
  if (stops && stops.length === colors.length) {
    colorStops = colors.map((color, i) => `${color} ${stops[i] * 100}%`).join(', ');
  } else {
    colorStops = colors.join(', ');
  }

  if (type === 'radial') {
    return `radial-gradient(${gradient.center || 'circle'}, ${colorStops})`;
  }

  return `linear-gradient(${begin}, ${colorStops})`;
}

/**
 * Converts BoxBorder to CSS border string
 */
function borderToCSS(border?: BoxBorder | string): CSSProperties {
  if (!border) return {};
  if (typeof border === 'string') return { border };

  const styles: CSSProperties = {};

  if (border.top) {
    const { width, color, style = 'solid' } = border.top;
    styles.borderTop = `${width}px ${style} ${color}`;
  }
  if (border.bottom) {
    const { width, color, style = 'solid' } = border.bottom;
    styles.borderBottom = `${width}px ${style} ${color}`;
  }
  if (border.left) {
    const { width, color, style = 'solid' } = border.left;
    styles.borderLeft = `${width}px ${style} ${color}`;
  }
  if (border.right) {
    const { width, color, style = 'solid' } = border.right;
    styles.borderRight = `${width}px ${style} ${color}`;
  }

  return styles;
}

/**
 * Builds BoxDecoration CSS (Flutter painting order)
 */
function decorationToCSS(decoration?: BoxDecoration, colorProp?: string): CSSProperties {
  const styles: CSSProperties = {};

  if (!decoration && !colorProp) return styles;

  const dec = decoration || {};

  // 1. Background color (bottom layer)
  const bgColor = colorProp || dec.color;
  if (bgColor) styles.backgroundColor = bgColor;

  // 2. Gradient (above color)
  const gradientCSS = gradientToCSS(dec.gradient);
  if (gradientCSS) styles.backgroundImage = gradientCSS;

  // 3. Background image (above gradient)
  if (dec.image) {
    const img = dec.image;
    styles.backgroundImage = `url(${img.image})`;
    styles.backgroundSize = img.fit || 'cover';
    styles.backgroundPosition = img.alignment || 'center';
    styles.backgroundRepeat = img.repeat || 'no-repeat';

    if (img.opacity !== undefined) {
      styles.opacity = img.opacity;
    }
  }

  // 4. Shape handling (Flutter spec: circle ignores borderRadius)
  if (dec.shape === BoxShape.circle) {
    styles.borderRadius = '50%'; // Perfect circle
    styles.aspectRatio = '1 / 1'; // Enforce square for perfect circle
  } else if (dec.borderRadius !== undefined) {
    styles.borderRadius =
      typeof dec.borderRadius === 'number' ? `${dec.borderRadius}px` : dec.borderRadius;
  }

  // 5. Border (painted above background)
  Object.assign(styles, borderToCSS(dec.border));

  // 6. Box shadow (painted below everything)
  const shadowCSS = boxShadowToCSS(dec.boxShadow);
  if (shadowCSS) styles.boxShadow = shadowCSS;

  // 7. Blend mode
  if (dec.backgroundBlendMode) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    styles.backgroundBlendMode = dec.backgroundBlendMode as any;
  }

  // 8. Opacity
  if (dec.opacity !== undefined) {
    styles.opacity = dec.opacity;
  }

  return styles;
}

/**
 * Normalizes dimension values
 */
function normalizeDimension(value?: number | string): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Maps alignment to transform-origin
 */
function alignmentToTransformOrigin(alignment: Alignment): string {
  const map: Record<Alignment, string> = {
    topLeft: 'top left',
    topCenter: 'top center',
    topRight: 'top right',
    centerLeft: 'center left',
    center: 'center',
    centerRight: 'center right',
    bottomLeft: 'bottom left',
    bottomCenter: 'bottom center',
    bottomRight: 'bottom right',
  };
  return map[alignment];
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

/**
 * Container - Flutter-style box model component
 * 
 * @example Basic usage
 * ```
 * <Container padding={16} color="#eb1660">
 *   <Text>Hello</Text>
 * </Container>
 * ```
 * 
 * @example Circular container (Flutter BoxShape.circle)
 * ```
 * <Container
 *   width={100}
 *   height={100}
 *   decoration={{
 *     color: '#eb1660',
 *     shape: BoxShape.circle
 *   }}
 * />
 * ```
 * 
 * @example Gradient with shadows
 * ```
 * <Container
 *   padding={20}
 *   decoration={{
 *     gradient: {
 *       colors: ['#eb1660', '#ff6b9d'],
 *       begin: '45deg'
 *     },
 *     borderRadius: 12,
 *     boxShadow: [
 *       { color: 'rgba(235, 22, 96, 0.3)', offset: { dx: 0, dy: 4 }, blurRadius: 12 }
 *     ]
 *   }}
 * />
 * ```
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  width,
  height,
  padding,
  paddingHorizontal,
  paddingVertical,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  margin,
  marginHorizontal,
  marginVertical,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  decoration,
  foregroundDecoration,
  color,
  alignment,
  constraints,
  transform,
  transformAlignment,
  clipBehavior = 'none',
  onTap,
  onClick,
  cursor,
  className = '',
  style = {},
  id,
  role,
  ariaLabel,
}) => {
  const resolvedPadding = resolvePadding({
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  });

  const resolvedMargin = resolveMargin({
    margin,
    marginHorizontal,
    marginVertical,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
  });

  // Build container styles (Flutter painting order)
  const containerStyles: CSSProperties = {
    // Margin (outermost)
    margin: edgeInsetsToCSS(resolvedMargin),

    // Dimensions
    width: normalizeDimension(width),
    height: normalizeDimension(height),

    // Constraints
    minWidth: normalizeDimension(constraints?.minWidth),
    maxWidth: normalizeDimension(constraints?.maxWidth),
    minHeight: normalizeDimension(constraints?.minHeight),
    maxHeight: normalizeDimension(constraints?.maxHeight),

    // Padding
    padding: edgeInsetsToCSS(resolvedPadding),

    // Decoration (background layer)
    ...decorationToCSS(decoration, color),

    // Alignment
    ...alignmentToFlexbox(alignment),

    // Transform
    transform: transform,
    transformOrigin: transformAlignment
      ? alignmentToTransformOrigin(transformAlignment)
      : undefined,

    // Clip behavior
    overflow: clipBehavior === 'none' ? 'visible' : 'hidden',

    // Cursor
    cursor: cursor || (onTap || onClick ? 'pointer' : undefined),

    // Box sizing
    boxSizing: 'border-box',

    // Position for stacking
    position: 'relative',

    // Custom styles (escape hatch)
    ...style,
  };

  const handleClick = onTap || onClick;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
<div
      id={id}
      className={className}
      style={containerStyles}
      onClick={handleClick}
      role={role}
      aria-label={ariaLabel}
    >
      {children}

      {/* Foreground decoration (painted on top) */}
      {foregroundDecoration && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            ...decorationToCSS(foregroundDecoration),
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS (Flutter-like API)
// ============================================================================

export const EdgeInsetsAll = (value: number): EdgeInsets => ({
  all: value,
});

export const EdgeInsetsSymmetric = ({
  horizontal = 0,
  vertical = 0,
}: {
  horizontal?: number;
  vertical?: number;
}): EdgeInsets => ({
  horizontal,
  vertical,
});

export const EdgeInsetsOnly = ({
  top,
  bottom,
  left,
  right,
}: {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}): EdgeInsets => ({
  top,
  bottom,
  left,
  right,
});

/**
 * Border.all() - Uniform border on all sides (Flutter API)
 */
export const BorderAll = ({
  width = 1,
  color = 'currentColor',
  style = 'solid' as 'solid' | 'dashed' | 'dotted',
}): BoxBorder => ({
  top: { width, color, style },
  bottom: { width, color, style },
  left: { width, color, style },
  right: { width, color, style },
});

/**
 * BorderRadius.circular() - Uniform circular radius (Flutter API)
 */
export const BorderRadiusCircular = (radius: number): number => radius;

export default Container;
