"use client";

import React, { type CSSProperties, type ReactNode } from "react";

// ============================================================================
// ENUMS - Flutter Stack Types
// ============================================================================

/**
 * StackFit - How to size non-positioned children in the stack
 */
export enum StackFit {
	/** Non-positioned children are as large as the stack allows (default in web) */
	expand = "expand",

	/** Non-positioned children are allowed to be as large as they want */
	loose = "loose",

	/** Non-positioned children are forced to be as small as possible */
	passthrough = "passthrough",
}

/**
 * Clip - How content outside bounds should be treated
 */
export enum Clip {
	/** Clip, but without anti-aliasing */
	hardEdge = "hidden",

	/** Clip with anti-aliasing */
	antiAlias = "hidden",

	/** Clip with anti-aliasing and save layer */
	antiAliasWithSaveLayer = "hidden",

	/** Do not clip */
	none = "visible",
}

// ============================================================================
// TYPES - Stack Alignment
// ============================================================================

/**
 * Alignment - Predefined alignment positions (Flutter pattern)
 */
export type StackAlignment =
	| "topLeft"
	| "topCenter"
	| "topRight"
	| "centerLeft"
	| "center"
	| "centerRight"
	| "bottomLeft"
	| "bottomCenter"
	| "bottomRight";

/**
 * TextDirection - For resolving alignment in RTL contexts
 */
export enum TextDirection {
	ltr = "ltr",
	rtl = "rtl",
}

// ============================================================================
// TYPES - Stack Props
// ============================================================================

/**
 * Stack Props - Mirrors Flutter Stack widget
 */
export interface StackProps {
	/**
	 * The widgets to stack (painted in order: first = bottom, last = top)
	 */
	children?: ReactNode;

	/**
	 * How to align non-positioned and partially-positioned children
	 *
	 * @default 'topLeft' (LTR) or 'topRight' (RTL)
	 *
	 * @example
	 * ```
	 * // Center all non-positioned children
	 * <Stack alignment="center">
	 *   <Container>Background</Container>
	 *   <Container>Centered on top</Container>
	 * </Stack>
	 * ```
	 */
	alignment?: StackAlignment;

	/**
	 * How to size non-positioned children in the stack
	 *
	 * @default StackFit.loose
	 *
	 * @example
	 * ```
	 * // Force children to fill the stack
	 * <Stack fit={StackFit.expand}>
	 *
	 * // Let children size themselves
	 * <Stack fit={StackFit.loose}>
	 * ```
	 */
	fit?: StackFit;

	/**
	 * Text direction for resolving alignment
	 *
	 * @default TextDirection.ltr
	 */
	textDirection?: TextDirection;

	/**
	 * How to clip content that overflows the stack
	 *
	 * @default Clip.hardEdge
	 */
	clipBehavior?: Clip;

	/**
	 * Additional CSS class names
	 */
	className?: string;

	/**
	 * Custom inline styles
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps StackAlignment to CSS positioning values
 */
function alignmentToPosition(
	alignment: StackAlignment,
	textDirection: TextDirection,
): CSSProperties {
	// For RTL, topLeft becomes topRight and vice versa
	const isRTL = textDirection === TextDirection.rtl;

	const alignmentMap: Record<StackAlignment, CSSProperties> = {
		topLeft: {
			top: 0,
			left: isRTL ? undefined : 0,
			right: isRTL ? 0 : undefined,
		},
		topCenter: {
			top: 0,
			left: "50%",
			transform: "translateX(-50%)",
		},
		topRight: {
			top: 0,
			right: isRTL ? undefined : 0,
			left: isRTL ? 0 : undefined,
		},
		centerLeft: {
			top: "50%",
			left: isRTL ? undefined : 0,
			right: isRTL ? 0 : undefined,
			transform: "translateY(-50%)",
		},
		center: {
			top: "50%",
			left: "50%",
			transform: "translate(-50%, -50%)",
		},
		centerRight: {
			top: "50%",
			right: isRTL ? undefined : 0,
			left: isRTL ? 0 : undefined,
			transform: "translateY(-50%)",
		},
		bottomLeft: {
			bottom: 0,
			left: isRTL ? undefined : 0,
			right: isRTL ? 0 : undefined,
		},
		bottomCenter: {
			bottom: 0,
			left: "50%",
			transform: "translateX(-50%)",
		},
		bottomRight: {
			bottom: 0,
			right: isRTL ? undefined : 0,
			left: isRTL ? 0 : undefined,
		},
	};

	return alignmentMap[alignment];
}

// ============================================================================
// STACK COMPONENT
// ============================================================================

/**
 * Stack - Positions children relative to the edges of its box
 *
 * Layout behavior (Flutter spec):
 * 1. Non-positioned children are positioned according to `alignment`
 * 2. Stack sizes itself to contain all non-positioned children
 * 3. Positioned children are placed relative to stack edges
 * 4. Children are painted in order (first = bottom, last = top)
 *
 * **Important:** Stack children are painted in order. To change z-index, reorder children.
 *
 * @example Basic layering
 * ```
 * <Stack>
 *   <Container width={100} height={100} color="red" />
 *   <Container width={80} height={80} color="green" />
 *   <Container width={60} height={60} color="blue" />
 * </Stack>
 * ```
 *
 * @example Positioned children
 * ```
 * <Stack style={{ width: 300, height: 300 }}>
 *   <Container color="white" />
 *   <Positioned top={10} left={10}>
 *     <Container padding={10} color="red">
 *       <p>Top Left</p>
 *     </Container>
 *   </Positioned>
 *   <Positioned bottom={10} right={10}>
 *     <Container padding={10} color="blue">
 *       <p>Bottom Right</p>
 *     </Container>
 *   </Positioned>
 * </Stack>
 * ```
 *
 * @example Image with gradient overlay (your hero pattern)
 * ```
 * <Stack style={{ width: '100%', height: '100vh' }}>
 *   <Container
 *     decoration={{
 *       image: {
 *         image: '/hero-bg.jpg',
 *         fit: 'cover',
 *       },
 *     }}
 *   />
 *   <Container
 *     decoration={{
 *       gradient: {
 *         type: 'linear',
 *         colors: ['rgba(13, 13, 13, 0)', 'rgba(13, 13, 13, 0.9)'],
 *         begin: 'to bottom',
 *       },
 *     }}
 *   />
 *   <Positioned bottom={40}>
 *     <Container padding={40}>
 *       <h1>Hero Title</h1>
 *     </Container>
 *   </Positioned>
 * </Stack>
 * ```
 */
export const Stack: React.FC<StackProps> = ({
	children,
	alignment = "topLeft",
	fit = StackFit.loose,
	textDirection = TextDirection.ltr,
	clipBehavior = Clip.hardEdge,
	className = "",
	style = {},
	id,
	onTap,
	onClick,
}) => {
	// Build stack styles
	const stackStyles: CSSProperties = {
		// Position context for children
		position: "relative",

		// Sizing behavior based on fit
		display: fit === StackFit.expand ? "flex" : "block",
		width: fit === StackFit.expand ? "100%" : "auto",
		height: fit === StackFit.expand ? "100%" : "auto",

		// Clip behavior
		overflow: clipBehavior,

		// Box sizing
		boxSizing: "border-box",

		// Text direction (for alignment resolution)
		direction: textDirection,

		// Custom styles
		...style,
	};

	const handleClick = onTap || onClick;

	// Process children to apply alignment to non-positioned children
	const processedChildren = React.Children.map(children, (child, index) => {
		if (!React.isValidElement(child)) return child;

		// Check if child is a Positioned component
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const isPositioned = (child.type as any)?.displayName === "Positioned";

		if (isPositioned) {
			// Let Positioned handle its own positioning
			return child;
		}

		// Apply alignment to non-positioned children
		const childStyles: CSSProperties = {
			position: "absolute",
			...alignmentToPosition(alignment, textDirection),

			// Sizing based on fit
			...(fit === StackFit.expand && {
				width: "100%",
				height: "100%",
			}),

			// Z-index based on order (first = bottom)
			zIndex: index,
		};

		return (
			// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
			<div style={childStyles} key={index}>
				{child}
			</div>
		);
	});

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			id={id}
			className={className}
			style={stackStyles}
			onClick={handleClick}
		>
			{processedChildren}
		</div>
	);
};

export default Stack;
