import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({ resolve: { alias: { "@": resolve(__dirname, ".") } }, test: { environment: "node", include: ["tests/**/*.test.ts"], env: { DATABASE_PATH: "/tmp/connections-tests.sqlite", DEMO_MODE: "false" } } });
