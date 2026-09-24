import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:5301" },
  webServer: {
    command: "cd examples/showcase && node ../../packages/layr/src/bin.ts build && node ../../packages/layr/src/bin.ts preview --port 5301",
    url: "http://localhost:5301",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox",
      // Headless Firefox starts slowly on Windows; the first test absorbs it.
      timeout: 90_000,
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: { firefoxUserPrefs: { "gfx.webrender.software": true, "layers.acceleration.disabled": true, "gfx.canvas.accelerated": false } },
      },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
