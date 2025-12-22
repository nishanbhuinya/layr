'use client';

// biome-ignore lint/style/useImportType: <explanation>
import React, { CSSProperties, ReactNode } from 'react';

// ============================================================================
// TYPES - SizedBox Props
// ============================================================================

/**
 * SizedBox Props - Mirrors Flutter SizedBox widget
 */
export interface SizedBoxProps {
  /**
   * The widget below this widget in the tree
   */
  children?: ReactNode;

  /**
   * If non-null, requires the child to have exactly this width
   * 
   * @example
   * ```
   * <SizedBox width={200}>
   *   <p>200px wide</p>
   * </SizedBox>
   * ```
   */
  width?: number | string;

  /**
   * If non-null, requires the child to have exactly this height
   * 
   * @example
   * ```
   * <SizedBox height={100}>
   *   <p>100px tall</p>
   * </SizedBox>
   * ```
   */
  height?: number | string;

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
 * Normalizes dimension values (number to px string)
 */
function normalizeDimension(value?: number | string): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

// ============================================================================
// SIZEDBOX COMPONENT
// ============================================================================

/**
 * SizedBox - A box with a specified size
 * 
 * If given a child, forces it to have a specific width/height.
 * If width or height is null, tries to match the child's size in that dimension.
 * If not given a child, tries to size itself as close to specified dimensions as possible.
 * 
 * **Lightweight alternative to Container when you only need sizing.**
 * 
 * @example Fixed size box
 * ```
 * <SizedBox width={200} height={300}>
 *   <Card>
 *     <Text>Hello World!</Text>
 *   </Card>
 * </SizedBox>
 * ```
 * 
 * @example Width only (height wraps content)
 * ```
 * <SizedBox width={400}>
 *   <p>This text is constrained to 400px width</p>
 * </SizedBox>
 * ```
 * 
 * @example Spacer (empty box)
 * ```
 * <Column>
 *   <p>Top</p>
 *   <SizedBox height={20} />
 *   <p>Bottom (20px below)</p>
 * </Column>
 * ```
 * 
 * @example Responsive width with fixed height
 * ```
 * <SizedBox width="100%" height={200}>
 *   <Container color="#eb1660" />
 * </SizedBox>
 * ```
 */
const SizedBoxBase: React.FC<SizedBoxProps> = ({
  children,
  width,
  height,
  className = '',
  style = {},
  id,
}) => {
  // Build sized box styles
  const boxStyles: CSSProperties = {
    // Explicit dimensions
    width: normalizeDimension(width),
    height: normalizeDimension(height),
    
    // Minimal styling (no decoration, just sizing)
    boxSizing: 'border-box',
    flexShrink: 0, // Prevent shrinking in flex layouts (Flutter behavior)
    
    // Custom styles
    ...style,
  };

  return (
    <div id={id} className={className} style={boxStyles}>
      {children}
    </div>
  );
};

// ============================================================================
// SIZEDBOX VARIANTS (Static Methods)
// ============================================================================

/**
 * SizedBox.expand - Creates a box that fills all available space
 * 
 * Equivalent to: SizedBox(width: double.infinity, height: double.infinity)
 * 
 * @example Fill parent container
 * ```
 * <Container width={400} height={400}>
 *   <SizedBox.expand>
 *     <Container color="#eb1660" />
 *   </SizedBox.expand>
 * </Container>
 * ```
 */
const SizedBoxExpand: React.FC<Omit<SizedBoxProps, 'width' | 'height'>> = (props) => (
  <SizedBoxBase width="100%" height="100%" {...props} />
);

/**
 * SizedBox.shrink - Creates a box that tries to be as small as possible
 * 
 * Equivalent to: SizedBox(width: 0, height: 0)
 * 
 * @example Conditional spacer (collapsed when not needed)
 * ```
 * {showSpacer ? <SizedBox height={20} /> : <SizedBox.shrink />}
 * ```
 */
const SizedBoxShrink: React.FC<Omit<SizedBoxProps, 'width' | 'height'>> = (props) => (
  <SizedBoxBase width={0} height={0} {...props} />
);

/**
 * SizedBox.square - Creates a box with equal width and height
 * 
 * @example 100x100 square
 * ```
 * <SizedBox.square dimension={100}>
 *   <Container color="#eb1660" />
 * </SizedBox.square>
 * ```
 */
const SizedBoxSquare: React.FC<Omit<SizedBoxProps, 'width' | 'height'> & { dimension?: number | string }> = ({
  dimension,
  ...props
}) => (
  <SizedBoxBase width={dimension} height={dimension} {...props} />
);

// ============================================================================
// EXPORT WITH STATIC METHODS
// ============================================================================

/**
 * SizedBox component with static methods
 */
interface SizedBoxComponent extends React.FC<SizedBoxProps> {
  expand: typeof SizedBoxExpand;
  shrink: typeof SizedBoxShrink;
  square: typeof SizedBoxSquare;
}

export const SizedBox = SizedBoxBase as SizedBoxComponent;

// Attach static methods
SizedBox.expand = SizedBoxExpand;
SizedBox.shrink = SizedBoxShrink;
SizedBox.square = SizedBoxSquare;

export default SizedBox;
