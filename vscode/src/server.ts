import { start } from "@layr-internal/lsp";

// The extension's own server, for files outside a project with LAYR installed; it reports the extension's version.
start({ version: process.env.LAYR_BUNDLED_VERSION });
