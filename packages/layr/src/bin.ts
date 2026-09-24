#!/usr/bin/env node
import { main } from "@layr-internal/cli";

main(process.argv.slice(2)).then(
  (code) => {
    if (code !== null) process.exit(code);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
