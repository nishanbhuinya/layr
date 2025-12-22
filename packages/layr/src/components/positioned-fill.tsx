"use client";

import type React from "react";
import { Positioned, type PositionedProps } from "./positioned";

// ============================================================================
// POSITIONED.FILL COMPONENT
// ============================================================================

/**
 * PositionedFill - Shorthand for Positioned that fills the entire stack
 *
 * Equivalent to: Positioned(top: 0, bottom: 0, left: 0, right: 0)
 *
 * @example Background overlay
 * ```
 * <Stack style={{ width: '100%', height: '100vh' }}>
 *   <Container decoration={{ image: { image: '/bg.jpg', fit: 'cover' } }} />
 *
 *   <PositionedFill>
 *     <Container decoration={{
 *       gradient: {
 *         colors: ['rgba(13,13,13,0)', 'rgba(13,13,13,0.9)'],
 *         begin: 'to bottom',
 *       },
 *     }} />
 *   </PositionedFill>
 * </Stack>
 * ```
 */
export const PositionedFill: React.FC<
	Omit<PositionedProps, "top" | "bottom" | "left" | "right">
> = ({ children, width, height, className, style }) => {
	return (
		<Positioned
			top={0}
			bottom={0}
			left={0}
			right={0}
			width={width}
			height={height}
			className={className}
			style={style}
		>
			{children}
		</Positioned>
	);
};

PositionedFill.displayName = "Positioned";

export default PositionedFill;
