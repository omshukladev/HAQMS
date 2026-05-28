import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import authRouter from "../src/routes/auth.js";
import { authenticate } from "../src/middleware/auth.js";

const prisma = new PrismaClient();

let app;
let testUserId;
let testToken;
const testEmail = "test@example.com";
const testPassword = "ValidPassword123!";
const testName = "Test User";

function createTestApp() {
  const testApp = express();

  testApp.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  }));

  testApp.use(express.json());

  // Mount auth router
  testApp.use("/api/auth", authRouter);

  // Global error handler (matches production)
  testApp.use((err, req, res, next) => {
    console.error("[CRITICAL-ERROR]:", err);
    res.status(500).json({
      message: "An unexpected internal server error occurred",
    });
  });

  return testApp;
}

describe("Auth Routes", () => {
  beforeAll(async () => {
    app = createTestApp();
    // Ensure JWT_SECRET is set
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-for-testing";
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test user before each test
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  describe("POST /api/auth/register", () => {
    it("should successfully register a new user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
          role: "RECEPTIONIST",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.name).toBe(testName);
      expect(res.body.data.user.role).toBe("RECEPTIONIST");
      // Ensure password hash is NOT returned
      expect(res.body.data.user).not.toHaveProperty("password");
    });

    it("should return error if email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          password: testPassword,
          name: testName,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required|email/i);
    });

    it("should return error if password is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          name: testName,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required|password/i);
    });

    it("should return error if name is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required|name/i);
    });

    it("should reject invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "invalid-email",
          password: testPassword,
          name: testName,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email.*format|valid.*email/i);
    });

    it("should reject password shorter than 6 characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: "short",
          name: testName,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*6|6.*characters/i);
    });

    it("should reject duplicate email registration", async () => {
      // First registration
      await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        });

      // Second registration with same email
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: "AnotherPassword123!",
          name: "Another User",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists|duplicate|email/i);
    });

    it("should not leak error stack in response", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        });

      // Even on error, should not leak stack
      expect(res.body).not.toHaveProperty("stack");
      expect(res.body).not.toHaveProperty("sqlMessage");
      expect(res.body).not.toHaveProperty("databaseError");
    });

    it("should set default role to RECEPTIONIST if not provided", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
          // role not provided
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe("RECEPTIONIST");
    });

    it("should return valid JWT token on successful registration", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        });

      expect(res.status).toBe(201);
      const token = res.body.data.token;
      
      // Verify token is valid JWT
      expect(token).toBeTruthy();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.id).toBe(res.body.data.user.id);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a test user before each login test
      const hashedPassword = require("bcryptjs").hashSync(testPassword, 10);
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          name: testName,
          role: "RECEPTIONIST",
        },
      });
      testUserId = user.id;
    });

    it("should successfully login with valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.name).toBe(testName);
      // Ensure password hash is NOT returned
      expect(res.body.data.user).not.toHaveProperty("password");
    });

    it("should return 401 for invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: testPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid.*credentials|credentials/i);
    });

    it("should return 401 for incorrect password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid.*credentials|credentials/i);
    });

    it("should return error if email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required|email/i);
    });

    it("should return error if password is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required|password/i);
    });

    it("should reject invalid email format on login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "invalid-email",
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email.*format|valid.*email/i);
    });

    it("should reject password shorter than 6 characters on login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*6|6.*characters/i);
    });

    it("should not leak error stack in response", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: "WrongPassword123!",
        });

      expect(res.body).not.toHaveProperty("stack");
      expect(res.body).not.toHaveProperty("sqlMessage");
      expect(res.body).not.toHaveProperty("errorStack");
      expect(res.body).not.toHaveProperty("databaseError");
    });

    it("should return valid JWT token on successful login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(201);
      const token = res.body.data.token;
      
      // Verify token is valid JWT
      expect(token).toBeTruthy();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.id).toBe(testUserId);
    });

    it("should have reasonable JWT expiration", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        });

      const token = res.body.data.token;
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp - now;

      // Token should expire in less than 24 hours (86400 seconds)
      // and more than 1 hour (3600 seconds)
      expect(expirationTime).toBeGreaterThan(3600);
      expect(expirationTime).toBeLessThan(86400);
    });
  });

  describe("GET /api/auth/me", () => {
    let validToken;

    beforeEach(async () => {
      // Create a test user
      const hashedPassword = require("bcryptjs").hashSync(testPassword, 10);
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          name: testName,
          role: "DOCTOR",
        },
      });
      testUserId = user.id;

      // Create a valid token
      validToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: "7h" },
      );
    });

    it("should return current user details with valid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.name).toBe(testName);
      expect(res.body.data.user.role).toBe("DOCTOR");
      // Ensure password is NOT returned
      expect(res.body.data.user).not.toHaveProperty("password");
    });

    it("should return 401 if no token is provided", async () => {
      const res = await request(app)
        .get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token|unauthorized|authentication/i);
    });

    it("should return 401 if token is invalid", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.here");

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token|unauthorized|invalid/i);
    });

    it("should return 401 if Authorization header format is wrong", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `InvalidFormat ${validToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token|authorization|bearer/i);
    });

    it("should return 404 if user no longer exists", async () => {
      // Delete the user
      await prisma.user.delete({ where: { id: testUserId } });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found|user/i);
    });

    it("should not leak error stack in response", async () => {
      const res = await request(app)
        .get("/api/auth/me");

      expect(res.body).not.toHaveProperty("stack");
      expect(res.body).not.toHaveProperty("sqlMessage");
      expect(res.body).not.toHaveProperty("databaseError");
    });

    it("should use consistent response format", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(201);
      // Should match the standardized format: status + data
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("user");
    });
  });

  describe("API Response Format Consistency", () => {
    it("register, login, and me endpoints should use same response structure", async () => {
      // Register
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        });

      // Login
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        });

      // Me endpoint
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${loginRes.body.data.token}`);

      // All should have status and data properties
      expect(registerRes.body).toHaveProperty("status");
      expect(registerRes.body).toHaveProperty("data");
      
      expect(loginRes.body).toHaveProperty("status");
      expect(loginRes.body).toHaveProperty("data");
      
      expect(meRes.body).toHaveProperty("status");
      expect(meRes.body).toHaveProperty("data");

      // All user objects should have same fields
      const userFields = ["id", "email", "name", "role"];
      userFields.forEach(field => {
        expect(registerRes.body.data.user).toHaveProperty(field);
        expect(loginRes.body.data.user).toHaveProperty(field);
        expect(meRes.body.data.user).toHaveProperty(field);
      });

      // None should expose password
      expect(registerRes.body.data.user).not.toHaveProperty("password");
      expect(loginRes.body.data.user).not.toHaveProperty("password");
      expect(meRes.body.data.user).not.toHaveProperty("password");
    });
  });

  describe("Security Tests", () => {
    it("should not leak plaintext passwords in any response", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        });

      // Check responses don't contain plaintext password
      expect(JSON.stringify(registerRes.body)).not.toContain(testPassword);
      expect(JSON.stringify(loginRes.body)).not.toContain(testPassword);
    });

    it("should use environment variable for JWT_SECRET (no hardcoded fallback)", async () => {
      // Read the auth.js file and verify no hardcoded JWT_SECRET fallback exists
      const fs = require("fs");
      const authJsContent = fs.readFileSync(
        require("path").join(__dirname, "../src/routes/auth.js"),
        "utf8",
      );

      // Should NOT contain the hardcoded fallback pattern
      expect(authJsContent).not.toMatch(
        /JWT_SECRET\s*=\s*process\.env\.JWT_SECRET\s*\|\|\s*['"`]/,
      );

      // Should use env-only pattern
      expect(authJsContent).toMatch(/JWT_SECRET\s*=\s*process\.env\.JWT_SECRET/);
    });

    it("should not expose database errors to client", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        });

      // Register again to trigger duplicate error
      const res2 = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        });

      // Error response should not contain SQL/database internals
      expect(JSON.stringify(res2.body)).not.toMatch(/sql|prisma|database|constraint|unique/i);
    });
  });
});
