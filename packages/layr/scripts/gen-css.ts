// Generates styles.css (base rules + default Design Scale) for projects using the TSX API or embedding LAYR in React apps.
import { writeFileSync } from "node:fs";
import { globalCss } from "@layr-internal/compiler";

writeFileSync(new URL("../styles.css", import.meta.url), `/* @dynshift/layr base styles and Design Scale (default frames). Generated; do not edit. */\n${globalCss()}\n`);
