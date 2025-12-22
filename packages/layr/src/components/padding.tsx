'use client';

import type React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { EdgeInsets } from './container';

// ============================================================================
// TYPES - Padding Props
// ============================================================================

/**
 * Padding Props - Mirrors Flutter Padding widget
 */
export interface PaddingProps {
  /**
   * The widget below this widget in the tree
   */
  children?: ReactNode;

  /**
   * The amount of space by which to inset the child
   * 
   * @example
   * ```
   * // All sides 16px
   * <Padding padding={16}>
   * 
   * // Symmetric padding
   * <Padding padding={{ horizontal: 20, vertical: 10 }}>
   * 
   * // Individual sides
   * <Padding padding={{ top: 10, left: 20, right: 20, bottom: 10 }}>
   * ```
   */
  padding: number | EdgeInsets;

  /**
   * Additional CSS class names
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
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts EdgeInsets to CSS padding values
 */
function edgeInsetsToPadding(insets: number | EdgeInsets): string {
  // If number, apply to all sides
  if (typeof insets === 'number') {
    return `${insets}px`;
  }

  // If EdgeInsets object
  if ('all' in insets && insets.all !== undefined) {
    // EdgeInsets.all(value)
    return `${insets.all}px`;
  }

  // Check for symmetric padding (horizontal/vertical)
  const hasHorizontal = 'horizontal' in insets;
  const hasVertical = 'vertical' in insets;

  if (hasHorizontal || hasVertical) {
    // EdgeInsets.symmetric
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const v = (insets as any).vertical ?? 0;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const h = (insets as any).horizontal ?? 0;
    return `${v}px ${h}px`;
  }

  // EdgeInsets.only - handle individual sides with type guard
  if ('top' in insets || 'right' in insets || 'bottom' in insets || 'left' in insets) {
    const top = insets.top ?? 0;
    const right = insets.right ?? 0;
    const bottom = insets.bottom ?? 0;
    const left = insets.left ?? 0;
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  // Fallback
  return '0px';
}

// ============================================================================
// PADDING COMPONENT
// ============================================================================

/**
 * Padding - A widget that insets its child by the given padding
 * 
 * When passing layout constraints to its child, padding shrinks the constraints
 * by the given padding. Padding then sizes itself to its child's size, inflated
 * by the padding.
 * 
 * **Lightweight alternative to Container when you only need padding.**
 * 
 * @example All sides equal
 * ```
 * <Padding padding={16}>
 *   <Text>Hello World!</Text>
 * </Padding>
 * ```
 * 
 * @example Symmetric padding
 * ```
 * <Padding padding={{ horizontal: 20, vertical: 10 }}>
 *   <Text>Hello World!</Text>
 * </Padding>
 * ```
 * 
 * @example Individual sides
 * ```
 * <Padding padding={{ top: 10, left: 20, right: 20, bottom: 30 }}>
 *   <Text>Hello World!</Text>
 * </Padding>
 * ```
 * 
 * @example Card with padding (Flutter pattern)
 * ```
 * <Container
 *   decoration={{
 *     color: '#1a1a1a',
 *     borderRadius: 16,
 *   }}
 * >
 *   <Padding padding={20}>
 *     <Column spacing={8}>
 *       <h3>Card Title</h3>
 *       <p>Card content goes here</p>
 *     </Column>
 *   </Padding>
 * </Container>
 * ```
 */
export const Padding: React.FC<PaddingProps> = ({
  children,
  padding,
  className = '',
  style = {},
  id,
}) => {
  // Build padding styles
  const paddingStyles: CSSProperties = {
    // Apply padding
    padding: edgeInsetsToPadding(padding),
    
    // Minimal styling (no decoration, just padding)
    boxSizing: 'border-box',
    
    // Custom styles
    ...style,
  };

  return (
    <div id={id} className={className} style={paddingStyles}>
      {children}
    </div>
  );
};

export default Padding;
