'use client';

import type React from 'react';
import type { CSSProperties, ReactNode } from 'react';

// ============================================================================
// TYPES - Positioned Props
// ============================================================================

/**
 * Positioned Props - Mirrors Flutter Positioned widget
 */
export interface PositionedProps {
  /**
   * The child widget to position
   */
  children?: ReactNode;

  /**
   * Distance from top edge of stack
   * 
   * @example
   * ```
   * <Positioned top={20}>
   *   <Container>20px from top</Container>
   * </Positioned>
   * ```
   */
  top?: number | string;

  /**
   * Distance from bottom edge of stack
   */
  bottom?: number | string;

  /**
   * Distance from left edge of stack (in LTR mode)
   */
  left?: number | string;

  /**
   * Distance from right edge of stack (in LTR mode)
   */
  right?: number | string;

  /**
   * Width of the positioned child
   * 
   * @example
   * ```
   * <Positioned left={0} right={0} width="100%">
   *   <Container>Full width</Container>
   * </Positioned>
   * ```
   */
  width?: number | string;

  /**
   * Height of the positioned child
   */
  height?: number | string;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Custom inline styles
   */
  style?: CSSProperties;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes dimension values (number to px string)
 */
function normalizeDimension(value?: number | string): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

// ============================================================================
// POSITIONED COMPONENT
// ============================================================================

/**
 * Positioned - Controls where a child of Stack is positioned
 * 
 * Must be a direct child of Stack. At least one of top, bottom, left, or right
 * must be non-null.
 * 
 * @example Basic positioning
 * ```
 * <Stack style={{ width: 300, height: 300 }}>
 *   <Positioned top={10} left={10}>
 *     <Container>Top Left</Container>
 *   </Positioned>
 *   <Positioned bottom={10} right={10}>
 *     <Container>Bottom Right</Container>
 *   </Positioned>
 * </Stack>
 * ```
 * 
 * @example Full width at bottom
 * ```
 * <Stack style={{ width: '100%', height: '100vh' }}>
 *   <Positioned left={0} right={0} bottom={0}>
 *     <Container padding={20} color="rgba(0,0,0,0.8)">
 *       <p>Footer overlay</p>
 *     </Container>
 *   </Positioned>
 * </Stack>
 * ```
 * 
 * @example Centered with specific size
 * ```
 * <Stack style={{ width: 400, height: 400 }}>
 *   <Positioned
 *     top="50%"
 *     left="50%"
 *     width={200}
 *     height={200}
 *     style={{ transform: 'translate(-50%, -50%)' }}
 *   >
 *     <Container color="blue">Centered</Container>
 *   </Positioned>
 * </Stack>
 * ```
 * 
 * @example Privogram hero badge (your design)
 * ```
 * <Stack style={{ width: '100%', height: '100vh' }}>
 *   <Container decoration={{ image: { image: '/bg.jpg', fit: 'cover' } }} />
 *   
 *   <Positioned top={20} right={20}>
 *     <Container
 *       padding={8}
 *       paddingHorizontal={16}
 *       decoration={{
 *         color: 'rgba(13, 13, 13, 0.6)',
 *         borderRadius: 99,
 *       }}
 *     >
 *       <span style={{ color: '#eb1660' }}>Early Access</span>
 *     </Container>
 *   </Positioned>
 * </Stack>
 * ```
 */
export const Positioned: React.FC<PositionedProps> = ({
  children,
  top,
  bottom,
  left,
  right,
  width,
  height,
  className = '',
  style = {},
}) => {
  // Build positioned styles
  const positionedStyles: CSSProperties = {
    position: 'absolute',
    
    // Position from edges
    top: normalizeDimension(top),
    bottom: normalizeDimension(bottom),
    left: normalizeDimension(left),
    right: normalizeDimension(right),
    
    // Explicit dimensions
    width: normalizeDimension(width),
    height: normalizeDimension(height),
    
    // Box sizing
    boxSizing: 'border-box',
    
    // Custom styles
    ...style,
  };

  return (
    <div className={className} style={positionedStyles}>
      {children}
    </div>
  );
};

// Display name for Stack to detect positioned children
Positioned.displayName = 'Positioned';

export default Positioned;
