"use client";

// ============================================================================
// LAYR - Main Export (v2 Compatible)
// ============================================================================

// Container & Box utilities
export {
    Container,
    BoxShape,
    EdgeInsetsAll,
    EdgeInsetsSymmetric,
    EdgeInsetsOnly,
    BorderAll,
    BorderRadiusCircular,
} from "./components/container";

// Centre/Center
export { Centre, Center } from "./components/centre";

// Column
export {
    Column,
    MainAxisAlignment as ColumnMainAxisAlignment,
    CrossAxisAlignment as ColumnCrossAxisAlignment,
    MainAxisSize as ColumnMainAxisSize,
    VerticalDirection,
} from "./components/column";

// Row
export {
    Row,
    MainAxisAlignment,
    CrossAxisAlignment,
    MainAxisSize,
    TextDirection,
} from "./components/row";

// Stack & Positioning
export {
    Stack,
    StackFit,
    Clip,
} from "./components/stack";

export { Positioned } from "./components/positioned";
export { PositionedFill } from "./components/positioned-fill";

// Layout utilities
export { SizedBox } from "./components/sized-box";
export { Padding } from "./components/padding";

// ============================================================================
// LAYR v2 - New Components
// ============================================================================

export { Scaffold, Frame } from "./components/core/scaffold";
export { AppBar } from "./components/core/app-bar";

// ============================================================================
// v2 Gradient System
// ============================================================================

export {
    LinearGradient,
    RadialGradient,
    ConicGradient,
    DiamondGradient,
} from "./utils/gradients";

// ============================================================================
// Type Exports
// ============================================================================

// Container types
export type {
    ContainerProps,
    EdgeInsets,
    BoxDecoration,
    BoxShadow,
    DecorationImage,
    Gradient,
    BoxBorder,
    BoxConstraints,
    Alignment,
} from "./components/container";

// Component Props
export type { CentreProps } from "./components/centre";
export type { ColumnProps } from "./components/column";
export type { RowProps } from "./components/row";
export type { StackProps, StackAlignment } from "./components/stack";
export type { PositionedProps } from "./components/positioned";
export type { SizedBoxProps } from "./components/sized-box";
export type { PaddingProps } from "./components/padding";

// v2 Component Props
export type { ScaffoldProps, AppBarMode, ScaffoldOverflow } from "./components/core/scaffold";
export type { AppBarProps, AppBarPosition } from "./components/core/app-bar";

// v2 Gradient Types
export type {
    GradientPosition,
    GradientDirection,
    GradientTileMode,
    LinearGradientProps,
    RadialGradientProps,
    ConicGradientProps,
    DiamondGradientProps,
    GradientInstance,
    BackgroundValue,
} from "./types/gradients";

// v2 Layout Types (additional, non-conflicting)
export type {
    ClipBehavior,
    OverflowBehavior,
    ObjectFit,
} from "./types/layout";
