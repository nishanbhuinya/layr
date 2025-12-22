'use client';

import type React from 'react';
import type { CSSProperties, ReactNode } from 'react';

// ============================================================================
// ENUMS - Re-export from Column for consistency
// ============================================================================

/**
 * MainAxisAlignment - How to distribute children along the main axis (horizontal for Row)
 */
export enum MainAxisAlignment {
  /** Place children at the start (left for LTR, right for RTL) */
  start = 'flex-start',
  
  /** Place children at the center */
  center = 'center',
  
  /** Place children at the end (right for LTR, left for RTL) */
  end = 'flex-end',
  
  /** Distribute remaining space evenly between children */
  spaceBetween = 'space-between',
  
  /** Distribute remaining space evenly around children */
  spaceAround = 'space-around',
  
  /** Distribute remaining space evenly, including edges */
  spaceEvenly = 'space-evenly',
}

/**
 * CrossAxisAlignment - How to align children along the cross axis (vertical for Row)
 */
export enum CrossAxisAlignment {
  /** Align children to the start (top) */
  start = 'flex-start',
  
  /** Align children to the center */
  center = 'center',
  
  /** Align children to the end (bottom) */
  end = 'flex-end',
  
  /** Stretch children to fill cross axis */
  stretch = 'stretch',
  
  /** Align children by their baseline (for text) */
  baseline = 'baseline',
}

/**
 * MainAxisSize - How much space should be occupied in the main axis
 */
export enum MainAxisSize {
  /** Take up maximum available space */
  max = 'max',
  
  /** Take up minimum space (wrap content) */
  min = 'min',
}

/**
 * TextDirection - Horizontal layout direction
 */
export enum TextDirection {
  /** Left to right (default for most languages) */
  ltr = 'ltr',
  
  /** Right to left (for Arabic, Hebrew, etc.) */
  rtl = 'rtl',
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Row Props - Mirrors Flutter Row widget
 */
export interface RowProps {
  /**
   * The widgets to display horizontally
   */
  children?: ReactNode;

  /**
   * How the children should be placed along the main axis (horizontal)
   * 
   * @default MainAxisAlignment.start
   * 
   * @example
   * ```
   * // Children at left (LTR) or right (RTL)
   * <Row mainAxisAlignment={MainAxisAlignment.start}>
   * 
   * // Children centered horizontally
   * <Row mainAxisAlignment={MainAxisAlignment.center}>
   * 
   * // Space between children
   * <Row mainAxisAlignment={MainAxisAlignment.spaceBetween}>
   * ```
   */
  mainAxisAlignment?: MainAxisAlignment;

  /**
   * How the children should be placed along the cross axis (vertical)
   * 
   * @default CrossAxisAlignment.center
   * 
   * @example
   * ```
   * // Top-aligned children
   * <Row crossAxisAlignment={CrossAxisAlignment.start}>
   * 
   * // Stretch children to full height
   * <Row crossAxisAlignment={CrossAxisAlignment.stretch}>
   * 
   * // Baseline-aligned text
   * <Row crossAxisAlignment={CrossAxisAlignment.baseline}>
   * ```
   */
  crossAxisAlignment?: CrossAxisAlignment;

  /**
   * How much space should be occupied in the main axis
   * 
   * @default MainAxisSize.max
   * 
   * @example
   * ```
   * // Row takes all available width
   * <Row mainAxisSize={MainAxisSize.max}>
   * 
   * // Row wraps to fit children width
   * <Row mainAxisSize={MainAxisSize.min}>
   * ```
   */
  mainAxisSize?: MainAxisSize;

  /**
   * The direction to lay children (left-to-right or right-to-left)
   * 
   * @default TextDirection.ltr
   * 
   * @example
   * ```
   * // Left to right (English, Spanish, etc.)
   * <Row textDirection={TextDirection.ltr}>
   * 
   * // Right to left (Arabic, Hebrew, etc.)
   * <Row textDirection={TextDirection.rtl}>
   * ```
   */
  textDirection?: TextDirection;

  /**
   * How much space to place between children in the main axis
   * 
   * @default 0
   * 
   * @example
   * ```
   * // 16px gap between all children
   * <Row spacing={16}>
   *   <Container>Child 1</Container>
   *   <Container>Child 2</Container>
   * </Row>
   * ```
   */
  spacing?: number;

  /**
   * Whether to clip children that overflow the row
   * 
   * @default 'visible'
   */
  clipBehavior?: 'visible' | 'hidden' | 'scroll';

  /**
   * Additional CSS class names (for Tailwind utilities)
   */
  className?: string;

  /**
   * Custom inline styles (escape hatch)
   */
  style?: CSSProperties;

  /**
   * HTML id attribute
   */
  id?: string;

  /**
   * Click handler
   */
  onTap?: () => void;
  onClick?: () => void;
}

// ============================================================================
// ROW COMPONENT
// ============================================================================

/**
 * Row - Displays children in a horizontal array
 * 
 * Layout algorithm (Flutter spec):
 * 1. Layout non-flex children with unbounded horizontal constraints
 * 2. Divide remaining horizontal space among flex children (Expanded)
 * 3. Height = maximum height of children
 * 4. Width = determined by mainAxisSize (max = fill parent, min = wrap content)
 * 5. Position children according to mainAxisAlignment and crossAxisAlignment
 * 
 * **Important:** Row does not scroll. If children overflow, consider using ListView.
 * 
 * @example Basic horizontal layout
 * ```
 * <Row>
 *   <Container padding={10}>Box 1</Container>
 *   <Container padding={10}>Box 2</Container>
 *   <Container padding={10}>Box 3</Container>
 * </Row>
 * ```
 * 
 * @example Centered with spacing
 * ```
 * <Row
 *   mainAxisAlignment={MainAxisAlignment.center}
 *   crossAxisAlignment={CrossAxisAlignment.center}
 *   spacing={16}
 * >
 *   <Container padding={10}>Box 1</Container>
 *   <Container padding={10}>Box 2</Container>
 * </Row>
 * ```
 * 
 * @example Space between items (navbar pattern)
 * ```
 * <Row mainAxisAlignment={MainAxisAlignment.spaceBetween}>
 *   <Logo />
 *   <NavLinks />
 *   <AuthButtons />
 * </Row>
 * ```
 * 
 * @example Right-to-left layout
 * ```
 * <Row textDirection={TextDirection.rtl}>
 *   <Text>مرحبا</Text>
 *   <Text>بالعالم</Text>
 * </Row>
 * ```
 * 
 * @example Icon + Text pattern
 * ```
 * <Row spacing={8} crossAxisAlignment={CrossAxisAlignment.center}>
 *   <Icon name="star" />
 *   <Text>Premium</Text>
 * </Row>
 * ```
 */
export const Row: React.FC<RowProps> = ({
  children,
  mainAxisAlignment = MainAxisAlignment.start,
  crossAxisAlignment = CrossAxisAlignment.center,
  mainAxisSize = MainAxisSize.max,
  textDirection = TextDirection.ltr,
  spacing = 0,
  clipBehavior = 'visible',
  className = '',
  style = {},
  id,
  onTap,
  onClick,
}) => {
  // Build row styles
  const rowStyles: CSSProperties = {
    // Flexbox for horizontal layout
    display: 'flex',
    flexDirection: textDirection === TextDirection.ltr ? 'row' : 'row-reverse',

    // Main axis alignment (horizontal)
    justifyContent: mainAxisAlignment,

    // Cross axis alignment (vertical)
    alignItems: crossAxisAlignment,

    // Main axis size behavior
    width: mainAxisSize === MainAxisSize.max ? '100%' : 'auto',
    minWidth: mainAxisSize === MainAxisSize.min ? 'auto' : undefined,

    // Spacing between children (CSS gap for clean implementation)
    gap: spacing > 0 ? `${spacing}px` : undefined,

    // Clip behavior
    overflow: clipBehavior,

    // Box sizing
    boxSizing: 'border-box',

    // Height behavior (Flutter spec: height = max height of children)
    height: 'auto', // Default to auto, children control their own height

    // Custom styles (escape hatch)
    ...style,
  };

  const handleClick = onTap || onClick;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
<div
      id={id}
      className={className}
      style={rowStyles}
      onClick={handleClick}
      dir={textDirection} // HTML dir attribute for proper text rendering
    >
      {children}
    </div>
  );
};

export default Row;
