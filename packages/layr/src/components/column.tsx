"use client";

import type React from "react";
import type { CSSProperties, ReactNode } from "react";

// ============================================================================
// ENUMS - Flutter Alignment Types
// ============================================================================

/**
 * MainAxisAlignment - How to distribute children along the main axis (vertical for Column)
 */
export enum MainAxisAlignment {
	/** Place children at the start (top) */
	start = "flex-start",

	/** Place children at the center */
	center = "center",

	/** Place children at the end (bottom) */
	end = "flex-end",

	/** Distribute remaining space evenly between children */
	spaceBetween = "space-between",

	/** Distribute remaining space evenly around children */
	spaceAround = "space-around",

	/** Distribute remaining space evenly, including edges */
	spaceEvenly = "space-evenly",
}

/**
 * CrossAxisAlignment - How to align children along the cross axis (horizontal for Column)
 */
export enum CrossAxisAlignment {
	/** Align children to the start (left) */
	start = "flex-start",

	/** Align children to the center */
	center = "center",

	/** Align children to the end (right) */
	end = "flex-end",

	/** Stretch children to fill cross axis */
	stretch = "stretch",

	/** Align children by their baseline (for text) */
	baseline = "baseline",
}

/**
 * MainAxisSize - How much space should be occupied in the main axis
 */
export enum MainAxisSize {
	/** Take up maximum available space */
	max = "max",

	/** Take up minimum space (wrap content) */
	min = "min",
}

/**
 * VerticalDirection - Order of children
 */
export enum VerticalDirection {
	/** Top to bottom (normal) */
	down = "down",

	/** Bottom to top (reversed) */
	up = "up",
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Column Props - Mirrors Flutter Column widget
 */
export interface ColumnProps {
	/**
	 * The widgets to display vertically
	 */
	children?: ReactNode;

	/**
	 * How the children should be placed along the main axis (vertical)
	 *
	 * @default MainAxisAlignment.start
	 *
	 * @example
	 * ```
	 * // Children at top
	 * <Column mainAxisAlignment={MainAxisAlignment.start}>
	 *
	 * // Children centered vertically
	 * <Column mainAxisAlignment={MainAxisAlignment.center}>
	 *
	 * // Space between children
	 * <Column mainAxisAlignment={MainAxisAlignment.spaceBetween}>
	 * ```
	 */
	mainAxisAlignment?: MainAxisAlignment;

	/**
	 * How the children should be placed along the cross axis (horizontal)
	 *
	 * @default CrossAxisAlignment.center
	 *
	 * @example
	 * ```
	 * // Left-aligned children
	 * <Column crossAxisAlignment={CrossAxisAlignment.start}>
	 *
	 * // Stretch children to full width
	 * <Column crossAxisAlignment={CrossAxisAlignment.stretch}>
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
	 * // Column takes all available height
	 * <Column mainAxisSize={MainAxisSize.max}>
	 *
	 * // Column wraps to fit children height
	 * <Column mainAxisSize={MainAxisSize.min}>
	 * ```
	 */
	mainAxisSize?: MainAxisSize;

	/**
	 * The direction to lay children (top-to-bottom or bottom-to-top)
	 *
	 * @default VerticalDirection.down
	 */
	verticalDirection?: VerticalDirection;

	/**
	 * How much space to place between children in the main axis
	 *
	 * @default 0
	 *
	 * @example
	 * ```
	 * // 16px gap between all children
	 * <Column spacing={16}>
	 *   <Container>Child 1</Container>
	 *   <Container>Child 2</Container>
	 * </Column>
	 * ```
	 */
	spacing?: number;

	/**
	 * Whether to clip children that overflow the column
	 *
	 * @default 'visible'
	 */
	clipBehavior?: "visible" | "hidden" | "scroll";

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
// COLUMN COMPONENT
// ============================================================================

/**
 * Column - Displays children in a vertical array
 *
 * Layout algorithm (Flutter spec):
 * 1. Layout non-flex children with unbounded vertical constraints
 * 2. Divide remaining vertical space among flex children (Expanded)
 * 3. Width = maximum width of children
 * 4. Height = determined by mainAxisSize (max = fill parent, min = wrap content)
 * 5. Position children according to mainAxisAlignment and crossAxisAlignment
 *
 * @example Basic vertical layout
 * ```
 * <Column>
 *   <Text>First</Text>
 *   <Text>Second</Text>
 *   <Text>Third</Text>
 * </Column>
 * ```
 *
 * @example Centered with spacing
 * ```
 * <Column
 *   mainAxisAlignment={MainAxisAlignment.center}
 *   crossAxisAlignment={CrossAxisAlignment.center}
 *   spacing={16}
 * >
 *   <Container padding={10}>Box 1</Container>
 *   <Container padding={10}>Box 2</Container>
 *   <Container padding={10}>Box 3</Container>
 * </Column>
 * ```
 *
 * @example Left-aligned, wrapping content
 * ```
 * <Column
 *   mainAxisSize={MainAxisSize.min}
 *   crossAxisAlignment={CrossAxisAlignment.start}
 *   spacing={8}
 * >
 *   <Text>Line 1</Text>
 *   <Text>Line 2</Text>
 *   <Text>Line 3</Text>
 * </Column>
 * ```
 *
 * @example Space between items
 * ```
 * <Column
 *   mainAxisAlignment={MainAxisAlignment.spaceBetween}
 *   style={{ height: '100vh' }}
 * >
 *   <Header />
 *   <Content />
 *   <Footer />
 * </Column>
 * ```
 */
export const Column: React.FC<ColumnProps> = ({
	children,
	mainAxisAlignment = MainAxisAlignment.start,
	crossAxisAlignment = CrossAxisAlignment.center,
	mainAxisSize = MainAxisSize.max,
	verticalDirection = VerticalDirection.down,
	spacing = 0,
	clipBehavior = "visible",
	className = "",
	style = {},
	id,
	onTap,
	onClick,
}) => {
	// Build column styles
	const columnStyles: CSSProperties = {
		// Flexbox for vertical layout
		display: "flex",
		flexDirection:
			verticalDirection === VerticalDirection.down
				? "column"
				: "column-reverse",

		// Main axis alignment (vertical)
		justifyContent: mainAxisAlignment,

		// Cross axis alignment (horizontal)
		alignItems: crossAxisAlignment,

		// Main axis size behavior
		height: mainAxisSize === MainAxisSize.max ? "100%" : "auto",
		minHeight: mainAxisSize === MainAxisSize.min ? "auto" : undefined,

		// Spacing between children (CSS gap for clean implementation)
		gap: spacing > 0 ? `${spacing}px` : undefined,

		// Clip behavior
		overflow: clipBehavior,

		// Box sizing
		boxSizing: "border-box",

		// Width behavior (Flutter spec: width = max width of children)
		width: "100%", // Default to full width, children can control their own width

		// Custom styles (escape hatch)
		...style,
	};

	const handleClick = onTap || onClick;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			id={id}
			className={className}
			style={columnStyles}
			onClick={handleClick}
		>
			{children}
		</div>
	);
};

export default Column;
