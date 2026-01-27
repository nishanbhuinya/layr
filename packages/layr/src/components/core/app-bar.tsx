"use client";

import type React from "react";
import type { CSSProperties, ReactNode } from "react";
import type { BackgroundValue } from "../../types/gradients";
import { gradientToCSS, isGradient } from "../../utils/gradients";

// ============================================================================
// TYPES
// ============================================================================

/**
 * AppBar position in Scaffold
 */
export type AppBarPosition = "top" | "bottom" | "left" | "right";

/**
 * AppBar Props - LAYR v2 app bar component
 *
 * Purpose: Navigation bar with title, actions, and semantic structure
 */
export interface AppBarProps {
  /**
   * App bar title (renders as h1 for SEO)
   *
   * JSX Mode:
   * ```tsx
   * <AppBar title="Home" />
   * ```
   *
   * Function Mode:
   * ```tsx
   * AppBar({ title: "Home" })
   * ```
   */
  title?: string | ReactNode;

  /**
   * Leading widget (left side, typically menu icon or back button)
   *
   * JSX Mode:
   * ```tsx
   * <AppBar
   *   leading={<IconButton icon="menu" />}
   *   title="Home"
   * />
   * ```
   *
   * Function Mode:
   * ```tsx
   * AppBar({
   *   leading: IconButton({ icon: "menu" }),
   *   title: "Home"
   * })
   * ```
   */
  leading?: ReactNode;

  /**
   * Action widgets (right side, typically icon buttons)
   *
   * JSX Mode:
   * ```tsx
   * <AppBar
   *   title="Profile"
   *   actions={[
   *     <IconButton key="search" icon="search" />,
   *     <IconButton key="settings" icon="settings" />
   *   ]}
   * />
   * ```
   *
   * Function Mode:
   * ```tsx
   * AppBar({
   *   title: "Profile",
   *   actions: [
   *     IconButton({ icon: "search" }),
   *     IconButton({ icon: "settings" })
   *   ]
   * })
   * ```
   */
  actions?: ReactNode[];

  /**
   * AppBar height
   * @default 64
   */
  height?: number;

  /**
   * AppBar width (for left/right positioned bars)
   * @default "100%" (for top/bottom)
   */
  width?: string | number;

  /**
   * Position in Scaffold
   * @default "top"
   */
  position?: AppBarPosition;

  /**
   * Background color or gradient
   * Supports solid colors and all gradient types
   * Special: "blur" for backdrop-filter effect
   *
   * Solid color:
   * ```tsx
   * AppBar({ background: "#1e293b", title: "Dark Mode" })
   * ```
   *
   * Gradient:
   * ```tsx
   * AppBar({
   *   background: LinearGradient({
   *     colors: ["#667eea", "#764ba2"],
   *     direction: "toright"
   *   }),
   *   title: "Gradient Bar"
   * })
   * ```
   *
   * Blur effect:
   * ```tsx
   * AppBar({ background: "blur", title: "Frosted Glass" })
   * ```
   */
  background?: BackgroundValue | "blur";

  /**
   * Box shadow elevation (Material Design style)
   * 0 = no shadow, higher = more elevated
   * @default 0
   *
   * @example
   * ```tsx
   * AppBar({ elevation: 4, title: "Elevated Bar" })
   * ```
   */
  elevation?: number;

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
   * ARIA role
   * @default "banner"
   */
  role?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates Material Design elevation shadow
 * @internal
 */
const getElevationShadow = (elevation: number): string => {
  const shadows: Record<number, string> = {
    0: "none",
    1: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
    2: "0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)",
    3: "0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)",
    4: "0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)",
    6: "0 20px 40px rgba(0,0,0,0.2)",
    8: "0 25px 50px rgba(0,0,0,0.25)",
  };

  return shadows[elevation] || shadows[0];
};

/**
 * Resolves background value to CSS properties
 * @internal
 */
const resolveAppBarBackground = (
  background?: BackgroundValue | "blur",
): CSSProperties => {
  if (!background) {
    return { backgroundColor: "transparent" };
  }

  // Special case: blur (backdrop-filter)
  if (background === "blur") {
    return {
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)", // Safari support
    };
  }

  // Solid color
  if (typeof background === "string") {
    return { backgroundColor: background };
  }

  // Gradient
  if (isGradient(background)) {
    return { background: gradientToCSS(background) };
  }

  return { backgroundColor: "transparent" };
};

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * Internal AppBar component (React.FC)
 * @internal
 */
const AppBarComponent: React.FC<AppBarProps> = ({
  title,
  leading,
  actions,
  height = 64,
  width = "100%",
  position = "top",
  background,
  elevation = 0,
  className = "",
  style = {},
  id,
  role = "banner",
}) => {
  // Build AppBar styles
  const appBarStyles: CSSProperties = {
    // Layout
    display: "flex",
    flexDirection:
      position === "left" || position === "right" ? "column" : "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",

    // Dimensions
    height: position === "top" || position === "bottom" ? height : "100%",
    width: position === "left" || position === "right" ? width : "100%",
    minHeight: height,

    // Padding
    paddingLeft: "16px",
    paddingRight: "16px",

    // Background
    ...resolveAppBarBackground(background),

    // Elevation
    boxShadow: getElevationShadow(elevation),

    // Box model
    boxSizing: "border-box",

    // Custom styles
    ...style,
  };

  // Title styles
  const titleStyles: CSSProperties = {
    margin: 0,
    fontSize: "20px",
    fontWeight: 500,
    flex: 1, // Take remaining space
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  // Leading/Actions container styles
  const leadingStyles: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const actionsStyles: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  return (
    <div id={id} className={className} style={appBarStyles} role={role}>
      {/* Leading widget */}
      {leading && <div style={leadingStyles}>{leading}</div>}

      {/* Title (semantic <h1> for SEO) */}
      {title &&
        (typeof title === "string" ? (
          <h1 style={titleStyles}>{title}</h1>
        ) : (
          <div style={titleStyles}>{title}</div>
        ))}

      {/* Action widgets */}
      {actions && actions.length > 0 && (
        <div style={actionsStyles}>{actions}</div>
      )}
    </div>
  );
};

AppBarComponent.displayName = "AppBar";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * AppBar - Navigation bar component for LAYR v2
 *
 * Dual-mode API: Works as both JSX component and function call
 *
 * Purpose:
 * - Provides consistent navigation UI
 * - Semantic HTML (uses h1 for title)
 * - Supports leading/trailing actions
 * - Material Design elevation
 * - Backdrop blur effects
 *
 * Layout behavior:
 * - Typically used inside Scaffold appBar slot
 * - Default height: 64px (standard Material Design)
 * - Flexbox layout for title and actions
 *
 * SEO benefits:
 * - Title renders as h1 (most important heading)
 * - Semantic structure for screen readers
 * - Proper landmark role ("banner")
 *
 * JSX Mode:
 * ```tsx
 * <AppBar title="Home" elevation={4} />
 * ```
 *
 * Function Mode (Flutter-style):
 * ```tsx
 * AppBar({ title: "Home", elevation: 4 })
 * ```
 *
 * With gradient and actions:
 * ```tsx
 * AppBar({
 *   leading: IconButton({ icon: "menu" }),
 *   title: "Dashboard",
 *   background: LinearGradient({
 *     colors: ["#667eea", "#764ba2"],
 *     direction: "toright"
 *   }),
 *   elevation: 4,
 *   actions: [
 *     IconButton({ icon: "search" }),
 *     IconButton({ icon: "profile" })
 *   ]
 * })
 * ```
 */
export function AppBar(props: AppBarProps): JSX.Element {
  return <AppBarComponent {...props} />;
}

AppBar.displayName = "AppBar";

export default AppBar;

