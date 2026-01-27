"use client";

import React from "react";
import type { CSSProperties, ReactNode } from "react";
import type { BackgroundValue } from "../../types/gradients";
import { gradientToCSS, isGradient } from "../../utils/gradients";

// ============================================================================
// TYPES
// ============================================================================

/**
 * AppBar positioning modes
 */
export type AppBarMode = "fixed" | "sticky";

/**
 * Overflow behavior for Scaffold body
 */
export type ScaffoldOverflow = "hidden" | "auto" | "scroll";

/**
 * Scaffold Props - LAYR v2 layout boundary component
 *
 * Purpose: Prevents layout overflow, provides semantic structure,
 * and manages viewport-level layout behavior.
 */
export interface ScaffoldProps {
  /**
   * Main content area (required)
   * Renders as semantic main element for SEO
   *
   * JSX Mode:
   * ```tsx
   * <Scaffold body={<Column>Content</Column>} />
   * ```
   *
   * Function Mode:
   * ```tsx
   * Scaffold({
   *   body: Column({}, [
   *     Text({}, "Content")
   *   ])
   * })
   * ```
   */
  body: ReactNode;

  /**
   * App bar at top of scaffold
   * Renders as semantic header element for SEO
   * Typically an AppBar component
   *
   * JSX Mode:
   * ```tsx
   * <Scaffold
   *   appBar={<AppBar title="Home" />}
   *   body={<div>Content</div>}
   * />
   * ```
   *
   * Function Mode:
   * ```tsx
   * Scaffold({
   *   appBar: AppBar({ title: "Home" }),
   *   body: "Content"
   * })
   * ```
   */
  appBar?: ReactNode;

  /**
   * Bottom navigation or footer bar
   * Renders as semantic footer element for SEO
   *
   * JSX Mode:
   * ```tsx
   * <Scaffold
   *   body={<div>Content</div>}
   *   bottomBar={<BottomNav />}
   * />
   * ```
   *
   * Function Mode:
   * ```tsx
   * Scaffold({
   *   body: "Content",
   *   bottomBar: BottomNav({})
   * })
   * ```
   */
  bottomBar?: ReactNode;

  /**
   * Scaffold width
   * @default "100vw"
   *
   * @example Custom width
   * ```tsx
   * Scaffold({ width: 1200, body: "Content" })
   * ```
   */
  width?: string | number;

  /**
   * Scaffold height
   * @default "100vh"
   *
   * @example Custom height
   * ```tsx
   * Scaffold({ height: "100dvh", body: "Content" })
   * ```
   */
  height?: string | number;

  /**
   * AppBar positioning behavior
   * - "fixed": AppBar stays at top, body scrolls underneath
   * - "sticky": AppBar scrolls with content, sticks at top when reached
   *
   * @default "fixed"
   *
   * Fixed mode (AppBar always visible):
   * ```tsx
   * Scaffold({
   *   appBarMode: "fixed",
   *   appBar: AppBar({ title: "Fixed Header" }),
   *   body: "Content"
   * })
   * ```
   *
   * Sticky mode (scrolls with content):
   * ```tsx
   * Scaffold({
   *   appBarMode: "sticky",
   *   appBar: AppBar({ title: "Sticky Header" }),
   *   body: "Content"
   * })
   * ```
   */
  appBarMode?: AppBarMode;

  /**
   * Overflow behavior for body content
   * - "hidden": Clips content at viewport bounds (no scrolling)
   * - "auto": Shows scrollbar only when content overflows
   * - "scroll": Always shows scrollbar
   *
   * @default "hidden"
   *
   * Enable scrolling:
   * ```tsx
   * Scaffold({
   *   overflow: "auto",
   *   body: Column({}, [
   *     // Content taller than viewport will scroll
   *     Box({ height: 2000 })
   *   ])
   * })
   * ```
   */
  overflow?: ScaffoldOverflow;

  /**
   * Background color, gradient, or image
   * Accepts solid colors, LinearGradient, RadialGradient, ConicGradient
   *
   * Solid color:
   * ```tsx
   * Scaffold({ background: "#0b0b0b", body: "Content" })
   * ```
   *
   * Linear gradient:
   * ```tsx
   * Scaffold({
   *   background: LinearGradient({
   *     colors: ["#667eea", "#764ba2"],
   *     direction: "tobottom"
   *   }),
   *   body: "Content"
   * })
   * ```
   *
   * Radial gradient:
   * ```tsx
   * Scaffold({
   *   background: RadialGradient({
   *     colors: ["#fbc2eb", "#a6c1ee"],
   *     center: "center"
   *   }),
   *   body: "Content"
   * })
   * ```
   *
   * Conic gradient:
   * ```tsx
   * Scaffold({
   *   background: ConicGradient({
   *     colors: ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"],
   *     center: "center"
   *   }),
   *   body: "Content"
   * })
   * ```
   */
  background?: BackgroundValue;

  /**
   * Override root element tag
   * @default "div"
   *
   * @example Use semantic section
   * ```tsx
   * Scaffold({ as: "section", body: "Content" })
   * ```
   */
  as?: string;

  /**
   * Additional CSS class names (for Tailwind, etc.)
   *
   * @example
   * ```tsx
   * Scaffold({ className: "dark:bg-gray-900", body: "Content" })
   * ```
   */
  className?: string;

  /**
   * Custom inline styles (escape hatch)
   *
   * @example
   * ```tsx
   * Scaffold({
   *   style: { fontFamily: "Inter, sans-serif" },
   *   body: "Content"
   * })
   * ```
   */
  style?: CSSProperties;

  /**
   * HTML id attribute
   */
  id?: string;

  /**
   * ARIA role
   */
  role?: string;

  /**
   * ARIA label for accessibility
   *
   * @example
   * ```tsx
   * Scaffold({
   *   ariaLabel: "Main application layout",
   *   body: "Content"
   * })
   * ```
   */
  ariaLabel?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes dimension values (number to px string)
 * @internal
 */
const normalizeDimension = (value?: string | number): string => {
  if (value === undefined) return "100%";
  return typeof value === "number" ? `${value}px` : value;
};

/**
 * Resolves background value to CSS string
 * @internal
 */
const resolveBackground = (
  background?: BackgroundValue,
): string | undefined => {
  if (!background) return undefined;

  if (typeof background === "string") {
    return background;
  }

  if (isGradient(background)) {
    return gradientToCSS(background);
  }

  return undefined;
};

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * Internal Scaffold component (React.FC)
 * @internal
 */
const ScaffoldComponent: React.FC<ScaffoldProps> = ({
  body,
  appBar,
  bottomBar,
  width = "100vw",
  height = "100vh",
  appBarMode = "fixed",
  overflow = "hidden",
  background,
  as = "div",
  className = "",
  style = {},
  id,
  role,
  ariaLabel,
}) => {
  // Build scaffold container styles
  const scaffoldStyles: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: normalizeDimension(width),
    height: normalizeDimension(height),
    overflow: overflow,
    background: resolveBackground(background),
    boxSizing: "border-box",
    margin: 0,
    padding: 0,
    position: "relative",
    ...style,
  };

  // AppBar wrapper styles
  const appBarWrapperStyles: CSSProperties = {
    position: appBarMode === "fixed" ? "sticky" : "relative",
    top: appBarMode === "fixed" ? 0 : undefined,
    zIndex: appBarMode === "fixed" ? 100 : undefined,
    flexShrink: 0,
  };

  // Body wrapper styles
  const bodyWrapperStyles: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: overflow === "hidden" ? "hidden" : "auto",
    boxSizing: "border-box",
    minHeight: 0,
    minWidth: 0,
  };

  // Bottom bar wrapper styles
  const bottomBarWrapperStyles: CSSProperties = {
    flexShrink: 0,
    zIndex: 50,
  };

  // Render scaffold
  const Component = as as keyof JSX.IntrinsicElements;

  return (
    <Component
      id={id}
      className={className}
      style={scaffoldStyles}
      role={role}
      aria-label={ariaLabel}
    >
      {appBar && <header style={appBarWrapperStyles}>{appBar}</header>}
      <main style={bodyWrapperStyles}>{body}</main>
      {bottomBar && <footer style={bottomBarWrapperStyles}>{bottomBar}</footer>}
    </Component>
  );
};

ScaffoldComponent.displayName = "Scaffold";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Scaffold - Layout boundary component for LAYR v2
 *
 * Dual-mode API: Works as both JSX component and function call
 *
 * Purpose:
 * - Prevents unwanted scrollbars (overflow control)
 * - Provides semantic HTML structure (header, main, footer)
 * - Manages viewport-level layout (100vw x 100vh by default)
 * - Supports fixed/sticky app bars
 *
 * Layout behavior:
 * - Always fills viewport (100vw x 100vh) unless width/height overridden
 * - AppBar: Fixed at top by default, or sticky on scroll
 * - Body: Main scrollable area (if overflow enabled)
 * - BottomBar: Fixed at bottom
 *
 * SEO benefits:
 * - Uses semantic HTML5 elements (header, main, footer)
 * - Improves accessibility scores
 * - Better landmark navigation for screen readers
 *
 * JSX Mode:
 * ```tsx
 * <Scaffold
 *   appBar={<AppBar title="Home" />}
 *   body={<Column>Content</Column>}
 * />
 * ```
 *
 * Function Mode (Flutter-style):
 * ```tsx
 * Scaffold({
 *   appBar: AppBar({ title: "Home" }),
 *   body: Column({}, ["Content"])
 * })
 * ```
 *
 * With scrolling body:
 * ```tsx
 * Scaffold({
 *   overflow: "auto",
 *   appBar: AppBar({ title: "Long Content" }),
 *   body: Column({}, [
 *     // Content taller than viewport scrolls
 *     Box({ height: 2000 })
 *   ])
 * })
 * ```
 *
 * With gradient background:
 * ```tsx
 * Scaffold({
 *   background: LinearGradient({
 *     colors: ["#1e3a8a", "#3b82f6"],
 *     direction: "tobottom"
 *   }),
 *   appBar: AppBar({
 *     title: "Gradient App",
 *     background: "blur",
 *     elevation: 0
 *   }),
 *   body: "Content"
 * })
 * ```
 *
 * Sticky app bar:
 * ```tsx
 * Scaffold({
 *   appBarMode: "sticky",
 *   appBar: AppBar({ title: "Sticky Header" }),
 *   body: Column({}, ["Content"])
 * })
 * ```
 */
export function Scaffold(props: ScaffoldProps): React.ReactElement {
  return React.createElement(ScaffoldComponent, props);
}

Scaffold.displayName = "Scaffold";

/**
 * Frame - Alias for Scaffold (shorter name for power users)
 *
 * Same functionality as Scaffold, just a shorter name
 *
 * @example
 * ```tsx
 * Frame({ body: "Content" })
 * ```
 */
export const Frame = Scaffold;

export default Scaffold;
