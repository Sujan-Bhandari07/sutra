import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  resolve: { alias: {
    "@sutra/shared": resolve(import.meta.dirname, "../../../libs/shared/src/index.ts"),
    "@sutra/db": resolve(import.meta.dirname, "../../../libs/db/src/index.ts"),
    "@sutra/redis": resolve(import.meta.dirname, "../../../libs/redis/src/index.ts"),
    "@sutra/filter": resolve(import.meta.dirname, "../../../libs/filter/src/index.ts"),
    "@sutra/secret": resolve(import.meta.dirname, "../../../libs/secret/src/index.ts"),
  } },
  test: {
    name: "agents",
    watch: false,
    globals: true,
    environment: "node",
    include: ["specs/**/*.spec.ts"],
  },
});
