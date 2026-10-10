import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      // Pure rules: fast, no database
      { resolve: { alias }, test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.int.test.ts"] } },
      // Against the dev database in .env.local; each test cleans up after itself
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["src/**/*.int.test.ts"],
          setupFiles: ["test/load-env.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
