"use client";

import {
  Scaffold,
  AppBar,
  LinearGradient,
  ConicGradient,
  RadialGradient,
} from "@dynshift/layr";

export default function Home() {
  return Scaffold({
    // overflow: "auto",
    appBar: AppBar({
      title: "Text",
      elevation: 2,
      background: "black",
      actions: [],
    }),
    background: RadialGradient({
      colors: ["red", "green", "magenta", "red"],
      centerX: 0.3,
      centerY: 0.7,
      radius: 0.5, // RADIUS IS NOT WORKING
    }),
    body: <h1>Text</h1>,
  });
}
