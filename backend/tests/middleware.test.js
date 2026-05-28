import { beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

let auth;

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get("/protected", auth.authenticate, (req, res) => {
    res.json({ status: "ok", user: req.user });
  });

  app.get("/admin", auth.authenticate, auth.authorize("ADMIN"), (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

describe("Auth middleware", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-middleware-secret";
    const mod = await import("../src/middleware/auth.js");
    auth = mod.default ?? mod;
  });

  it("rejects expired tokens", async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { id: "user-1", email: "doctor@example.com", role: "DOCTOR" },
      process.env.JWT_SECRET,
      { expiresIn: "-10s" },
    );

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token.");
    expect(res.body).not.toHaveProperty("details");
  });

  it("rejects invalid tokens without leaking verification details", async () => {
    const app = createTestApp();

    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token.");
    expect(res.body).not.toHaveProperty("details");
  });

  it("allows valid authenticated users through", async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { id: "user-1", email: "doctor@example.com", role: "DOCTOR" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.user.role).toBe("DOCTOR");
  });

  it("blocks non-admin users from admin routes", async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { id: "user-2", email: "doctor@example.com", role: "DOCTOR" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  it("allows admin users to access admin routes", async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
