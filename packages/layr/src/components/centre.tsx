"use client";

import type React from "react";
import type { CSSProperties, ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Centre Props - Mirrors Flutter Center widget
 */
export interface CentreProps {
	/**
	 * The child widget to center
	 */
	children?: ReactNode;

	/**
	 * If non-null, sets its width to the child's width multiplied by this factor.
	 *
	 * For example, if widthFactor is 2.0, the Centre will be twice as wide as its child.
	 * If null (default), the Centre will be as wide as its parent allows.
	 *
	 * @example
	 * ```
	 * // Centre will be exactly as wide as the child
	 * <Centre widthFactor={1.0}>
	 *   <Text>Hello</Text>
	 * </Centre>
	 *
	 * // Centre will be 1.5x wider than the child
	 * <Centre widthFactor={1.5}>
	 *   <Text>Hello</Text>
	 * </Centre>
	 * ```
	 */
	widthFactor?: number;

	/**
	 * If non-null, sets its height to the child's height multiplied by this factor.
	 *
	 * For example, if heightFactor is 2.0, the Centre will be twice as tall as its child.
	 * If null (default), the Centre will be as tall as its parent allows.
	 */
	heightFactor?: number;

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
}

// ============================================================================
// CENTRE COMPONENT
// ============================================================================

/**
 * Centre - Centers its child both horizontally and vertically
 *
 * Behavior (Flutter spec):
 * - If widthFactor and heightFactor are null: expands to fill parent
 * - If widthFactor is set: width = child's width × widthFactor
 * - If heightFactor is set: height = child's height × heightFactor
 * - Always centers the child within the available space
 *
 * @example Basic usage
 * ```
 * <Centre>
 *   <Text>Centered text</Text>
 * </Centre>
 * ```
 *
 * @example With size factors
 * ```
 * <Centre widthFactor={1.5} heightFactor={2.0}>
 *   <Container width={100} height={50}>
 *     <Text>Box</Text>
 *   </Container>
 * </Centre>
 * // Result: Centre will be 150px wide (100 × 1.5) and 100px tall (50 × 2.0)
 * ```
 *
 * @example Full screen center
 * ```
 * <Centre style={{ minHeight: '100vh' }}>
 *   <Container padding={20}>
 *     <Text>Perfectly centered on screen</Text>
 *   </Container>
 * </Centre>
 * ```
 */
export const Centre: React.FC<CentreProps> = ({
	children,
	widthFactor,
	heightFactor,
	className = "",
	style = {},
	id,
}) => {
	// Build container styles
	const containerStyles: CSSProperties = {
		// Always use flexbox for centering
		display: "flex",
		justifyContent: "center",
		alignItems: "center",

		// Size behavior (Flutter spec):
		// - If factor is null: expand to fill parent (width/height: 100%)
		// - If factor is set: size will be determined by child (fit-content)
		width: widthFactor === undefined ? "100%" : "fit-content",
		height: heightFactor === undefined ? "100%" : "fit-content",

		// Box sizing
		boxSizing: "border-box",

		// Custom styles (escape hatch)
		...style,
	};

	// If widthFactor or heightFactor is set, we need a wrapper to apply the scaling
	if (widthFactor !== undefined || heightFactor !== undefined) {
		return (
			<div id={id} className={className} style={containerStyles}>
				<div
					style={{
						transform: `scale(${widthFactor || 1}, ${heightFactor || 1})`,
						transformOrigin: "center",
					}}
				>
					{children}
				</div>
			</div>
		);
	}

	// Simple case: no size factors, just center the child
	return (
		<div id={id} className={className} style={containerStyles}>
			{children}
		</div>
	);
};

// ============================================================================
// CONVENIENCE ALIASES
// ============================================================================

/**
 * Center - American English spelling alias
 */
export const Center = Centre;

export default Centre;
