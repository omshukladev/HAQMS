const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/app.js"],
    },
    // Locally: use Docker PostgreSQL so tests don't hit Neon.
    // In CI: DATABASE_URL is set by the CI workflow (PostgreSQL service container),
    // so don't override it.
    env: process.env.CI ? {} : {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/haqms?schema=public",
    },
  },
});
