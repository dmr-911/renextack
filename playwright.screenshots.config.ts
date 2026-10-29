import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** `npm run screenshots`: regenerates docs/screenshots from a production build with seed data. */
export default defineConfig({
  ...base,
  testDir: "tests/screenshots",
  reporter: "list",
  retries: 0,
  use: { ...base.use, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
});
