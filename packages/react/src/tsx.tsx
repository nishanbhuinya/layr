/**
 * `@dynshift/layr/tsx`: LAYR's core widgets as plain React components, for projects that are not
 * using `.layr` files yet. Config keys are props; values use LAYR units (numbers are design px).
 * Lowering happens at runtime (no compiler), so per-frame interpolation and static CSS are not
 * available here. Import `@dynshift/layr/styles.css` once and wrap the app in `<LayrProvider>`.
 *
 *   <Container w={200} h={120} color="#0d0d0d" cornerRadius={16} objAlign="mid">
 *     <Text color="white">Hello</Text>
 *   </Container>
 */
import { RUNTIME_TABLE } from "@layr-internal/model";
import type { Action } from "@layr-internal/runtime";
import { createElement, type ReactNode } from "react";
import { N } from "./node.tsx";

export type LayrProps = Record<string, unknown> & { children?: ReactNode; id?: string };

const EVENT = /^on([A-Z]\w*)$/;

function toNode(name: string, props: LayrProps): ReactNode {
  const d: Record<string, unknown> = {};
  const on: Record<string, Action> = {};
  let children: ReactNode;
  for (const [k, v] of Object.entries(props)) {
    if (k === "children") children = v as ReactNode;
    else if (k === "id") continue;
    else if (EVENT.test(k) && typeof v === "function") {
      const ev = (EVENT.exec(k) as RegExpExecArray)[1] as string;
      const key = ev === "Press" || ev === "Click" ? "press" : ev.charAt(0).toLowerCase() + ev.slice(1);
      on[key] = (_ctx, ...args) => (v as (...a: unknown[]) => unknown)(...args);
    } else d[k] = v;
  }
  if (name === "Gap" && typeof children === "number") {
    d.size = children;
    children = undefined;
  }
  return createElement(N, { w: name, d, on: Object.keys(on).length ? on : undefined, a: props.id ? `tsx::${props.id}` : undefined, children });
}

function component(name: string) {
  const C = (props: LayrProps) => toNode(name, props);
  C.displayName = name;
  return C;
}

export const Container = component("Container");
export const Row = component("Row");
export const Column = component("Column");
export const Stack = component("Stack");
export const Position = component("Position");
export const Order = component("Order");
export const Mid = component("Mid");
export const Align = component("Align");
export const Expand = component("Expand");
export const Gap = component("Gap");
export const Wrap = component("Wrap");
export const Grid = component("Grid");
export const Scroll = component("Scroll");
export const Aspect = component("Aspect");
export const SafeArea = component("SafeArea");
export const Adapt = component("Adapt");
export const Scaffold = component("Scaffold");
export const Text = component("Text");
export const Span = component("Span");
export const Image = component("Image");
export const Svg = component("Svg");
export const Icon = component("Icon");
export const Video = component("Video");
export const Blur = component("Blur");
export const Mask = component("Mask");
export const Subtract = component("Subtract");
export const Clip = component("Clip");
export const Filter = component("Filter");
export const Button = component("Button");
export const Link = component("Link");
export const Input = component("Input");
export const Toggle = component("Toggle");
export const Select = component("Select");
export const Slider = component("Slider");
export const Form = component("Form");
export const Overlay = component("Overlay");
export const Focus = component("Focus");
export const Animate = component("Animate");

/** Every core widget by name (includes aliases such as Col and Box). */
export const widgets: Record<string, ReturnType<typeof component>> = Object.fromEntries(
  Object.entries(RUNTIME_TABLE).flatMap(([name, row]) => [name, ...(row[2] ?? [])].map((n) => [n, component(name)])),
);
