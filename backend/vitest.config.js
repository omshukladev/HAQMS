const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/app.js"],
    },
    // Use local Docker PostgreSQL for tests (dev uses Neon via .env)
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/haqms?schema=public",
    },
  },
});
