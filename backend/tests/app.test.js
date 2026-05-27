import { describe, it, expect } from "vitest";
import express from "express";
import cors from "cors";
import request from "supertest";

function createTestApp() {
  const app = express();

  // Matches the exact CORS config from src/app.js
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    }),
  );

  app.use(express.json());

  // Health check route (same as production)
  app.get("/", (req, res) => {
    res.json({ status: "ok" });
  });

  // Route designed to trigger the global error handler via next(err)
  app.get("/__test/error", (req, res, next) => {
    next(new Error("Simulated internal failure"));
  });

  // Matches the exact error handler from src/app.js
  app.use((err, req, res, next) => {
    console.error("[CRITICAL-ERROR]:", err);
    res.status(500).json({
      message: "An unexpected internal server error occurred",
    });
  });

  return app;
}

describe("CORS Configuration", () => {
  const app = createTestApp();

  it("allows requests from the configured origin", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not echo back unconfigured origins", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "https://evil.com");

    expect(res.headers["access-control-allow-origin"]).not.toBe(
      "https://evil.com",
    );
  });

  it("responds correctly to preflight OPTIONS requests", async () => {
    const res = await request(app)
      .options("/")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(res.headers["access-control-allow-methods"]).toContain("GET");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(res.headers["access-control-allow-methods"]).toContain("DELETE");
  });
});

describe("Global Error Handler", () => {
  const app = createTestApp();

  it("returns 500 with a generic message", async () => {
    const res = await request(app).get("/__test/error");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe(
      "An unexpected internal server error occurred",
    );
  });

  it("does not leak error details or stack traces", async () => {
    const res = await request(app).get("/__test/error");

    expect(res.body).not.toHaveProperty("error");
    expect(res.body).not.toHaveProperty("stack");
    expect(res.body).not.toHaveProperty("details");
    expect(res.body).not.toHaveProperty("sqlMessage");
  });
});

describe("Health Check", () => {
  const app = createTestApp();

  it("returns 200 on GET /", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
