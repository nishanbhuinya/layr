import layr from "@dynshift/layr/vite";
import { defineConfig } from "vite";
import { siteContent } from "./build/content.ts";

export default defineConfig({
  plugins: [siteContent(), layr()],
  build: { chunkSizeWarningLimit: 1200 },
});
